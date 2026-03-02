-- ============================================
-- FUNÇÕES DE CÁLCULO E ATUALIZAÇÃO AUTOMÁTICA
-- ============================================

-- ============================================
-- 1. ATUALIZAÇÃO DE SALDO DE CARTÃO
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_credit_card_balance(card_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  new_balance DECIMAL(15, 2);
BEGIN
  -- Calcular saldo baseado nas transações não pagas
  SELECT COALESCE(SUM(cct.amount), 0)
  INTO new_balance
  FROM credit_card_transactions cct
  LEFT JOIN credit_card_invoices cci ON cct.invoice_id = cci.id
  WHERE cct.credit_card_id = card_id
    AND (cci.status IS NULL OR cci.status IN ('open', 'closed', 'overdue'));

  -- Atualizar o saldo do cartão
  UPDATE credit_cards
  SET current_balance = new_balance, updated_at = NOW()
  WHERE id = card_id;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. ATUALIZAÇÃO DE TOTAL DE FATURA
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_invoice_total(invoice_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  new_total DECIMAL(15, 2);
BEGIN
  -- Calcular total baseado nas transações da fatura
  SELECT COALESCE(SUM(amount), 0)
  INTO new_total
  FROM credit_card_transactions
  WHERE invoice_id = recalculate_invoice_total.invoice_id;

  -- Atualizar o total da fatura
  UPDATE credit_card_invoices
  SET total_amount = new_total, updated_at = NOW()
  WHERE id = invoice_id;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. ATRIBUIR TRANSAÇÃO DE CARTÃO À FATURA CORRETA
-- ============================================

CREATE OR REPLACE FUNCTION assign_transaction_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  card RECORD;
  target_month DATE;
  target_invoice_id UUID;
BEGIN
  -- Buscar informações do cartão
  SELECT * INTO card
  FROM credit_cards
  WHERE id = NEW.credit_card_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calcular qual fatura pertence baseado na data da transação e dia de fechamento
  IF EXTRACT(DAY FROM NEW.transaction_date) <= card.close_day THEN
    -- Se for antes do fechamento, vai para a fatura do mês atual
    target_month := DATE_TRUNC('month', NEW.transaction_date);
  ELSE
    -- Se for depois do fechamento, vai para a fatura do próximo mês
    target_month := DATE_TRUNC('month', NEW.transaction_date + INTERVAL '1 month');
  END IF;

  -- Buscar ou criar fatura
  SELECT id INTO target_invoice_id
  FROM credit_card_invoices
  WHERE credit_card_id = NEW.credit_card_id
    AND reference_month = target_month;

  IF NOT FOUND THEN
    -- Criar nova fatura
    INSERT INTO credit_card_invoices (
      credit_card_id,
      user_id,
      reference_month,
      close_date,
      due_date,
      status
    ) VALUES (
      NEW.credit_card_id,
      NEW.user_id,
      target_month,
      target_month + (card.close_day - 1) * INTERVAL '1 day',
      target_month + (card.due_day - 1) * INTERVAL '1 day',
      'open'
    )
    RETURNING id INTO target_invoice_id;
  END IF;

  -- Atribuir transação à fatura
  NEW.invoice_id := target_invoice_id;

  -- Recalcular total da fatura
  PERFORM recalculate_invoice_total(target_invoice_id);

  -- Recalcular saldo do cartão
  PERFORM recalculate_credit_card_balance(NEW.credit_card_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_assign_transaction_to_invoice ON credit_card_transactions;
CREATE TRIGGER trigger_assign_transaction_to_invoice
  BEFORE INSERT ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION assign_transaction_to_invoice();

-- ============================================
-- 4. TRIGGER PARA ATUALIZAR FATURA QUANDO TRANSAÇÃO MUDA
-- ============================================

CREATE OR REPLACE FUNCTION update_invoice_on_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Recalcular fatura anterior
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM recalculate_invoice_total(OLD.invoice_id);
    END IF;
    PERFORM recalculate_credit_card_balance(OLD.credit_card_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Se mudou de fatura, recalcular ambas
    IF OLD.invoice_id != NEW.invoice_id THEN
      IF OLD.invoice_id IS NOT NULL THEN
        PERFORM recalculate_invoice_total(OLD.invoice_id);
      END IF;
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM recalculate_invoice_total(NEW.invoice_id);
      END IF;
    ELSE
      -- Recalcular fatura atual
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM recalculate_invoice_total(NEW.invoice_id);
      END IF;
    END IF;

    PERFORM recalculate_credit_card_balance(NEW.credit_card_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_invoice_on_transaction_change ON credit_card_transactions;
CREATE TRIGGER trigger_update_invoice_on_transaction_change
  AFTER UPDATE OR DELETE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_transaction_change();

-- ============================================
-- 5. CRIAR PARCELAS AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION create_installments(
  p_credit_card_id UUID,
  p_user_id UUID,
  p_description TEXT,
  p_total_amount DECIMAL,
  p_installments INTEGER,
  p_transaction_date DATE,
  p_category_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  installment_amount DECIMAL(15, 2);
  parent_id UUID;
  i INTEGER;
  installment_date DATE;
BEGIN
  -- Calcular valor de cada parcela
  installment_amount := ROUND(p_total_amount / p_installments, 2);

  -- Criar primeira parcela (parent)
  INSERT INTO credit_card_transactions (
    credit_card_id,
    user_id,
    transaction_date,
    description,
    amount,
    category_id,
    installments,
    current_installment,
    parent_transaction_id,
    notes
  ) VALUES (
    p_credit_card_id,
    p_user_id,
    p_transaction_date,
    p_description || ' (1/' || p_installments || ')',
    installment_amount,
    p_category_id,
    p_installments,
    1,
    NULL,
    p_notes
  )
  RETURNING id INTO parent_id;

  -- Criar parcelas subsequentes
  FOR i IN 2..p_installments LOOP
    installment_date := p_transaction_date + ((i - 1) * INTERVAL '1 month');

    -- Ajustar última parcela para compensar arredondamento
    IF i = p_installments THEN
      installment_amount := p_total_amount - (installment_amount * (p_installments - 1));
    END IF;

    INSERT INTO credit_card_transactions (
      credit_card_id,
      user_id,
      transaction_date,
      description,
      amount,
      category_id,
      installments,
      current_installment,
      parent_transaction_id,
      notes
    ) VALUES (
      p_credit_card_id,
      p_user_id,
      installment_date,
      p_description || ' (' || i || '/' || p_installments || ')',
      installment_amount,
      p_category_id,
      p_installments,
      i,
      parent_id,
      p_notes
    );
  END LOOP;

  RETURN parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FECHAR FATURA AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION close_invoice(invoice_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invoice RECORD;
BEGIN
  -- Buscar fatura
  SELECT * INTO invoice
  FROM credit_card_invoices
  WHERE id = close_invoice.invoice_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Só pode fechar se estiver aberta
  IF invoice.status != 'open' THEN
    RETURN false;
  END IF;

  -- Fechar fatura
  UPDATE credit_card_invoices
  SET status = 'closed', updated_at = NOW()
  WHERE id = close_invoice.invoice_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. PAGAR FATURA
-- ============================================

CREATE OR REPLACE FUNCTION pay_invoice(
  p_invoice_id UUID,
  p_payment_amount DECIMAL,
  p_payment_date DATE,
  p_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  invoice RECORD;
  transaction_id UUID;
BEGIN
  -- Buscar fatura
  SELECT * INTO invoice
  FROM credit_card_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Criar transação de pagamento
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    date,
    category_id,
    bank_account_id
  )
  SELECT
    invoice.user_id,
    'expense',
    p_payment_amount,
    'Pagamento fatura ' || cc.card_name || ' - ' || TO_CHAR(invoice.reference_month, 'MM/YYYY'),
    p_payment_date,
    (SELECT id FROM categories WHERE user_id = invoice.user_id AND name ILIKE '%cartão%' LIMIT 1),
    p_bank_account_id
  FROM credit_cards cc
  WHERE cc.id = invoice.credit_card_id
  RETURNING id INTO transaction_id;

  -- Atualizar fatura
  UPDATE credit_card_invoices
  SET
    paid_amount = paid_amount + p_payment_amount,
    payment_transaction_id = transaction_id,
    status = CASE
      WHEN (paid_amount + p_payment_amount) >= total_amount THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. CALCULAR PATRIMÔNIO LÍQUIDO
-- ============================================

CREATE OR REPLACE FUNCTION calculate_net_worth(p_user_id UUID)
RETURNS TABLE (
  cash_accounts DECIMAL,
  investments DECIMAL,
  credit_cards DECIMAL,
  net_worth DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Contas correntes e poupança
    COALESCE((
      SELECT SUM(balance)
      FROM bank_accounts
      WHERE user_id = p_user_id
        AND account_type IN ('checking', 'savings')
        AND is_active = true
    ), 0) as cash_accounts,

    -- Investimentos
    COALESCE((
      SELECT SUM(current_value)
      FROM investments
      WHERE user_id = p_user_id
        AND is_active = true
    ), 0) as investments,

    -- Dívidas de cartão (NEGATIVO)
    -COALESCE((
      SELECT SUM(total_amount - paid_amount)
      FROM credit_card_invoices
      WHERE user_id = p_user_id
        AND status IN ('open', 'closed', 'partial', 'overdue')
    ), 0) as credit_cards,

    -- Total líquido
    COALESCE((
      SELECT SUM(balance)
      FROM bank_accounts
      WHERE user_id = p_user_id
        AND account_type IN ('checking', 'savings')
        AND is_active = true
    ), 0) +
    COALESCE((
      SELECT SUM(current_value)
      FROM investments
      WHERE user_id = p_user_id
        AND is_active = true
    ), 0) -
    COALESCE((
      SELECT SUM(total_amount - paid_amount)
      FROM credit_card_invoices
      WHERE user_id = p_user_id
        AND status IN ('open', 'closed', 'partial', 'overdue')
    ), 0) as net_worth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. CALCULAR RESERVA DE EMERGÊNCIA
-- ============================================

CREATE OR REPLACE FUNCTION calculate_emergency_reserve(p_user_id UUID)
RETURNS TABLE (
  current_amount DECIMAL,
  target_amount DECIMAL,
  monthly_expense_base DECIMAL,
  target_months INTEGER,
  percentage_complete DECIMAL
) AS $$
DECLARE
  goal RECORD;
  current_reserve DECIMAL;
  monthly_expenses DECIMAL;
BEGIN
  -- Buscar meta ativa
  SELECT * INTO goal
  FROM emergency_reserve_goals
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;

  -- Calcular valor atual da reserva
  SELECT COALESCE(SUM(current_value), 0)
  INTO current_reserve
  FROM investments
  WHERE user_id = p_user_id
    AND is_emergency_reserve = true
    AND is_active = true;

  -- Se tem meta e auto_calculate, calcular base mensal
  IF goal IS NOT NULL AND goal.auto_calculate THEN
    -- Calcular gastos fixos mensais
    SELECT COALESCE(SUM(amount), 0)
    INTO monthly_expenses
    FROM recurring_expenses
    WHERE user_id = p_user_id
      AND is_active = true
      AND frequency = 'monthly';

    -- Atualizar meta
    UPDATE emergency_reserve_goals
    SET
      monthly_expense_base = monthly_expenses,
      target_amount = monthly_expenses * target_months,
      current_amount = current_reserve,
      updated_at = NOW()
    WHERE id = goal.id;
  ELSE
    monthly_expenses := COALESCE(goal.monthly_expense_base, 0);
  END IF;

  RETURN QUERY
  SELECT
    current_reserve,
    COALESCE(goal.target_amount, monthly_expenses * COALESCE(goal.target_months, 6)),
    monthly_expenses,
    COALESCE(goal.target_months, 6),
    CASE
      WHEN COALESCE(goal.target_amount, monthly_expenses * COALESCE(goal.target_months, 6)) > 0
      THEN (current_reserve / COALESCE(goal.target_amount, monthly_expenses * COALESCE(goal.target_months, 6))) * 100
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. ATUALIZAR STATUS DE FATURAS VENCIDAS
-- ============================================

CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE credit_card_invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status IN ('open', 'closed', 'partial')
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
