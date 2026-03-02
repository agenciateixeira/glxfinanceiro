-- ============================================
-- SISTEMA DE CARTÕES DE CRÉDITO
-- ============================================

-- Criar tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL, -- conta que paga a fatura
  card_name TEXT NOT NULL,
  card_network TEXT CHECK (card_network IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other')),
  last_digits TEXT, -- últimos 4 dígitos
  close_day INTEGER NOT NULL CHECK (close_day >= 1 AND close_day <= 31), -- dia de fechamento
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31), -- dia de vencimento
  credit_limit DECIMAL(15, 2) DEFAULT 0.00,
  current_balance DECIMAL(15, 2) DEFAULT 0.00, -- quanto está devendo
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'credit-card',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para credit_cards
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_bank_account_id ON credit_cards(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_is_active ON credit_cards(is_active);

-- ============================================
-- FATURAS DE CARTÃO
-- ============================================

CREATE TABLE IF NOT EXISTS credit_card_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL, -- ex: 2026-03-01 (sempre dia 1)
  close_date DATE NOT NULL, -- data de fechamento da fatura
  due_date DATE NOT NULL, -- data de vencimento
  total_amount DECIMAL(15, 2) DEFAULT 0.00, -- total da fatura
  paid_amount DECIMAL(15, 2) DEFAULT 0.00, -- quanto foi pago
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'partial', 'overdue')),
  payment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- transação de pagamento
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir uma fatura por mês por cartão
  CONSTRAINT unique_invoice_per_month UNIQUE (credit_card_id, reference_month)
);

-- Criar índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_credit_card_id ON credit_card_invoices(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON credit_card_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON credit_card_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON credit_card_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_month ON credit_card_invoices(reference_month);

-- ============================================
-- TRANSAÇÕES DE CARTÃO DE CRÉDITO
-- ============================================

CREATE TABLE IF NOT EXISTS credit_card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES credit_card_invoices(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Parcelamento
  installments INTEGER DEFAULT 1 CHECK (installments >= 1),
  current_installment INTEGER DEFAULT 1 CHECK (current_installment >= 1),
  parent_transaction_id UUID REFERENCES credit_card_transactions(id) ON DELETE SET NULL, -- primeira parcela

  -- Reconciliação
  reconciled BOOLEAN DEFAULT false,
  matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validação: parcela atual não pode ser maior que total
  CONSTRAINT valid_installment CHECK (current_installment <= installments)
);

-- Criar índices para credit_card_transactions
CREATE INDEX IF NOT EXISTS idx_cc_trans_credit_card_id ON credit_card_transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_cc_trans_invoice_id ON credit_card_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cc_trans_user_id ON credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_trans_date ON credit_card_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cc_trans_category_id ON credit_card_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_cc_trans_reconciled ON credit_card_transactions(reconciled);
CREATE INDEX IF NOT EXISTS idx_cc_trans_parent_id ON credit_card_transactions(parent_transaction_id);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Trigger para credit_cards
CREATE OR REPLACE FUNCTION update_credit_card_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_cards_updated_at ON credit_cards;
CREATE TRIGGER trigger_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_card_updated_at();

-- Trigger para invoices
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON credit_card_invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- Trigger para credit_card_transactions
CREATE OR REPLACE FUNCTION update_cc_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cc_trans_updated_at ON credit_card_transactions;
CREATE TRIGGER trigger_cc_trans_updated_at
  BEFORE UPDATE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_cc_transaction_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para credit_cards (com compartilhamento entre cônjuges)
DROP POLICY IF EXISTS "Users can view their credit cards" ON credit_cards;
CREATE POLICY "Users can view their credit cards"
  ON credit_cards FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_cards.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_cards.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their credit cards" ON credit_cards;
CREATE POLICY "Users can insert their credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their credit cards" ON credit_cards;
CREATE POLICY "Users can update their credit cards"
  ON credit_cards FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_cards.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_cards.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their credit cards" ON credit_cards;
CREATE POLICY "Users can delete their credit cards"
  ON credit_cards FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_cards.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_cards.user_id)
    )
  );

-- Políticas para credit_card_invoices
DROP POLICY IF EXISTS "Users can view their invoices" ON credit_card_invoices;
CREATE POLICY "Users can view their invoices"
  ON credit_card_invoices FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_invoices.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_invoices.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their invoices" ON credit_card_invoices;
CREATE POLICY "Users can insert their invoices"
  ON credit_card_invoices FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their invoices" ON credit_card_invoices;
CREATE POLICY "Users can update their invoices"
  ON credit_card_invoices FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_invoices.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_invoices.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their invoices" ON credit_card_invoices;
CREATE POLICY "Users can delete their invoices"
  ON credit_card_invoices FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_invoices.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_invoices.user_id)
    )
  );

-- Políticas para credit_card_transactions
DROP POLICY IF EXISTS "Users can view their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can view their cc transactions"
  ON credit_card_transactions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_transactions.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can insert their cc transactions"
  ON credit_card_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can update their cc transactions"
  ON credit_card_transactions FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_transactions.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can delete their cc transactions"
  ON credit_card_transactions FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = credit_card_transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = credit_card_transactions.user_id)
    )
  );
