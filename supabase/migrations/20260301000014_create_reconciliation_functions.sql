-- ============================================
-- FUNÇÕES DE RECONCILIAÇÃO AUTOMÁTICA
-- ============================================

-- ============================================
-- 1. BUSCAR TRANSAÇÕES SIMILARES PARA RECONCILIAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_transactions(
  p_statement_item_id UUID
)
RETURNS TABLE (
  transaction_id UUID,
  similarity_score DECIMAL,
  match_reason TEXT
) AS $$
DECLARE
  item RECORD;
BEGIN
  -- Buscar item do extrato
  SELECT * INTO item
  FROM bank_statement_items
  WHERE id = p_statement_item_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    CASE
      -- Match perfeito: data e valor exatos
      WHEN t.date = item.statement_date AND t.amount = ABS(item.amount) THEN 1.0
      -- Data exata, valor próximo (±2%)
      WHEN t.date = item.statement_date AND ABS(t.amount - ABS(item.amount)) / t.amount < 0.02 THEN 0.9
      -- Data ±3 dias, valor exato
      WHEN ABS(t.date - item.statement_date) <= 3 AND t.amount = ABS(item.amount) THEN 0.85
      -- Data ±3 dias, valor próximo
      WHEN ABS(t.date - item.statement_date) <= 3 AND ABS(t.amount - ABS(item.amount)) / t.amount < 0.02 THEN 0.75
      -- Data ±7 dias, valor exato
      WHEN ABS(t.date - item.statement_date) <= 7 AND t.amount = ABS(item.amount) THEN 0.7
      -- Mesmo valor, data diferente
      WHEN t.amount = ABS(item.amount) THEN 0.5
      ELSE 0.3
    END as similarity_score,
    CASE
      WHEN t.date = item.statement_date AND t.amount = ABS(item.amount) THEN 'Data e valor exatos'
      WHEN t.date = item.statement_date THEN 'Data exata, valor similar'
      WHEN t.amount = ABS(item.amount) THEN 'Valor exato, data próxima'
      ELSE 'Possível match'
    END as match_reason
  FROM transactions t
  WHERE
    t.user_id = item.user_id
    AND t.bank_account_id = item.bank_account_id
    AND t.type = CASE WHEN item.type = 'debit' THEN 'expense' ELSE 'income' END
    -- Buscar em janela de ±30 dias
    AND ABS(t.date - item.statement_date) <= 30
    -- Valor similar (±10%)
    AND ABS(t.amount - ABS(item.amount)) / t.amount < 0.10
    -- Não está reconciliado ainda
    AND NOT EXISTS (
      SELECT 1 FROM bank_statement_items bsi
      WHERE bsi.matched_transaction_id = t.id
        AND bsi.reconciled = true
    )
  ORDER BY similarity_score DESC, ABS(t.date - item.statement_date)
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. RECONCILIAR AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION auto_reconcile_statement_item(
  p_statement_item_id UUID,
  p_min_confidence DECIMAL DEFAULT 0.9
)
RETURNS BOOLEAN AS $$
DECLARE
  best_match RECORD;
  item RECORD;
BEGIN
  -- Buscar item do extrato
  SELECT * INTO item
  FROM bank_statement_items
  WHERE id = p_statement_item_id;

  IF NOT FOUND OR item.reconciled THEN
    RETURN false;
  END IF;

  -- Buscar melhor match
  SELECT * INTO best_match
  FROM find_similar_transactions(p_statement_item_id)
  ORDER BY similarity_score DESC
  LIMIT 1;

  -- Se encontrou match com confiança suficiente, reconciliar
  IF best_match IS NOT NULL AND best_match.similarity_score >= p_min_confidence THEN
    UPDATE bank_statement_items
    SET
      reconciled = true,
      matched_transaction_id = best_match.transaction_id,
      confidence_score = best_match.similarity_score,
      reconciliation_date = NOW(),
      updated_at = NOW()
    WHERE id = p_statement_item_id;

    -- Registrar no log
    INSERT INTO reconciliation_log (
      user_id,
      action_type,
      statement_item_id,
      transaction_id,
      confidence_score,
      description
    ) VALUES (
      item.user_id,
      'auto_match',
      p_statement_item_id,
      best_match.transaction_id,
      best_match.similarity_score,
      best_match.match_reason
    );

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. DETECTAR PAGAMENTO DE FATURA DE CARTÃO
-- ============================================

CREATE OR REPLACE FUNCTION detect_invoice_payment(
  p_statement_item_id UUID
)
RETURNS UUID AS $$
DECLARE
  item RECORD;
  invoice RECORD;
BEGIN
  -- Buscar item do extrato
  SELECT * INTO item
  FROM bank_statement_items
  WHERE id = p_statement_item_id;

  IF NOT FOUND OR item.type != 'debit' THEN
    RETURN NULL;
  END IF;

  -- Buscar fatura com valor similar e vencimento próximo
  SELECT * INTO invoice
  FROM credit_card_invoices cci
  JOIN credit_cards cc ON cci.credit_card_id = cc.id
  WHERE
    cci.user_id = item.user_id
    AND cc.bank_account_id = item.bank_account_id
    AND cci.status IN ('closed', 'open', 'partial')
    -- Valor similar (±1%)
    AND ABS(cci.total_amount - ABS(item.amount)) / cci.total_amount < 0.01
    -- Data próxima ao vencimento (±5 dias)
    AND ABS(cci.due_date - item.statement_date) <= 5
  ORDER BY ABS(cci.due_date - item.statement_date)
  LIMIT 1;

  IF invoice IS NOT NULL THEN
    -- Marcar item como reconciliado com a fatura
    UPDATE bank_statement_items
    SET
      reconciled = true,
      matched_invoice_payment_id = invoice.id,
      confidence_score = 0.95,
      reconciliation_date = NOW(),
      updated_at = NOW()
    WHERE id = p_statement_item_id;

    -- Registrar pagamento da fatura
    PERFORM pay_invoice(
      invoice.id,
      ABS(item.amount),
      item.statement_date,
      item.bank_account_id
    );

    -- Log
    INSERT INTO reconciliation_log (
      user_id,
      action_type,
      statement_item_id,
      confidence_score,
      description,
      metadata
    ) VALUES (
      item.user_id,
      'auto_match',
      p_statement_item_id,
      0.95,
      'Pagamento de fatura detectado automaticamente',
      jsonb_build_object('invoice_id', invoice.id, 'card_name', (SELECT card_name FROM credit_cards WHERE id = invoice.credit_card_id))
    );

    RETURN invoice.id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. APLICAR REGRAS DE RECONCILIAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION apply_reconciliation_rules(
  p_statement_item_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  item RECORD;
  rule RECORD;
  matched BOOLEAN := false;
BEGIN
  -- Buscar item do extrato
  SELECT * INTO item
  FROM bank_statement_items
  WHERE id = p_statement_item_id;

  IF NOT FOUND OR item.reconciled THEN
    RETURN false;
  END IF;

  -- Buscar regras aplicáveis, ordenadas por prioridade
  FOR rule IN
    SELECT *
    FROM reconciliation_rules
    WHERE user_id = item.user_id
      AND is_active = true
    ORDER BY priority DESC, created_at
  LOOP
    -- Verificar se a regra se aplica
    IF rule.pattern_type = 'description' THEN
      IF rule.case_sensitive THEN
        matched := item.description ~ rule.pattern_value;
      ELSE
        matched := item.description ~* rule.pattern_value;
      END IF;
    ELSIF rule.pattern_type = 'amount' THEN
      matched := ABS(item.amount)::TEXT = rule.pattern_value;
    ELSIF rule.pattern_type = 'description_amount' THEN
      -- Implementar lógica combinada
      matched := false; -- TODO
    END IF;

    IF matched THEN
      -- Aplicar sugestões da regra
      UPDATE bank_statement_items
      SET
        suggested_category_id = COALESCE(rule.suggested_category_id, suggested_category_id),
        suggested_description = COALESCE(rule.suggested_description, suggested_description),
        updated_at = NOW()
      WHERE id = p_statement_item_id;

      -- Atualizar estatísticas da regra
      UPDATE reconciliation_rules
      SET
        match_count = match_count + 1,
        last_match_date = NOW(),
        updated_at = NOW()
      WHERE id = rule.id;

      -- Se auto_reconcile, criar transação automaticamente
      IF rule.auto_reconcile THEN
        -- TODO: Implementar criação automática de transação
        NULL;
      END IF;

      -- Log
      INSERT INTO reconciliation_log (
        user_id,
        action_type,
        statement_item_id,
        rule_id,
        description
      ) VALUES (
        item.user_id,
        'suggest',
        p_statement_item_id,
        rule.id,
        'Regra aplicada: ' || rule.pattern_value
      );

      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. PROCESSAR ITEM DE EXTRATO (PIPELINE COMPLETO)
-- ============================================

CREATE OR REPLACE FUNCTION process_statement_item(
  p_statement_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  invoice_id UUID;
  reconciled BOOLEAN;
BEGIN
  result := jsonb_build_object(
    'statement_item_id', p_statement_item_id,
    'invoice_payment_detected', false,
    'auto_reconciled', false,
    'rules_applied', false
  );

  -- 1. Verificar se é pagamento de fatura
  invoice_id := detect_invoice_payment(p_statement_item_id);
  IF invoice_id IS NOT NULL THEN
    result := result || jsonb_build_object('invoice_payment_detected', true, 'invoice_id', invoice_id);
    RETURN result;
  END IF;

  -- 2. Tentar reconciliação automática
  reconciled := auto_reconcile_statement_item(p_statement_item_id, 0.9);
  IF reconciled THEN
    result := result || jsonb_build_object('auto_reconciled', true);
    RETURN result;
  END IF;

  -- 3. Aplicar regras de reconciliação
  reconciled := apply_reconciliation_rules(p_statement_item_id);
  IF reconciled THEN
    result := result || jsonb_build_object('rules_applied', true);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER PARA PROCESSAR ITEM AO IMPORTAR
-- ============================================

CREATE OR REPLACE FUNCTION auto_process_new_statement_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Processar item automaticamente em background
  PERFORM process_statement_item(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_process_statement_item ON bank_statement_items;
CREATE TRIGGER trigger_auto_process_statement_item
  AFTER INSERT ON bank_statement_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_new_statement_item();

-- ============================================
-- 7. BUSCAR ITENS NÃO RECONCILIADOS
-- ============================================

CREATE OR REPLACE FUNCTION get_unreconciled_items(
  p_user_id UUID,
  p_bank_account_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  statement_date DATE,
  description TEXT,
  amount DECIMAL,
  type TEXT,
  suggested_category_id UUID,
  suggested_description TEXT,
  similar_transactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bsi.id,
    bsi.statement_date,
    bsi.description,
    bsi.amount,
    bsi.type,
    bsi.suggested_category_id,
    bsi.suggested_description,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', st.transaction_id,
          'score', st.similarity_score,
          'reason', st.match_reason
        )
      )
      FROM find_similar_transactions(bsi.id) st
    ) as similar_transactions
  FROM bank_statement_items bsi
  WHERE
    bsi.user_id = p_user_id
    AND bsi.reconciled = false
    AND (p_bank_account_id IS NULL OR bsi.bank_account_id = p_bank_account_id)
  ORDER BY bsi.statement_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. ESTATÍSTICAS DE RECONCILIAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION get_reconciliation_stats(
  p_user_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_items INTEGER,
  reconciled_items INTEGER,
  unreconciled_items INTEGER,
  auto_reconciled INTEGER,
  manual_reconciled INTEGER,
  reconciliation_rate DECIMAL
) AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '30 days');
  end_date := COALESCE(p_period_end, CURRENT_DATE);

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_items,
    COUNT(*) FILTER (WHERE reconciled = true)::INTEGER as reconciled_items,
    COUNT(*) FILTER (WHERE reconciled = false)::INTEGER as unreconciled_items,
    COUNT(*) FILTER (WHERE reconciled = true AND confidence_score >= 0.9)::INTEGER as auto_reconciled,
    COUNT(*) FILTER (WHERE reconciled = true AND confidence_score < 0.9)::INTEGER as manual_reconciled,
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE reconciled = true)::DECIMAL / COUNT(*)) * 100
      ELSE 0
    END as reconciliation_rate
  FROM bank_statement_items
  WHERE
    user_id = p_user_id
    AND statement_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
