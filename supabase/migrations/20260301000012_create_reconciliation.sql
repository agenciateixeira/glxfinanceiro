-- ============================================
-- SISTEMA DE RECONCILIAÇÃO DE EXTRATOS
-- ============================================

-- Criar tabela de itens de extrato bancário
CREATE TABLE IF NOT EXISTS bank_statement_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  -- Dados do extrato
  statement_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')), -- débito ou crédito
  balance DECIMAL(15, 2), -- saldo após transação (se disponível)

  -- Identificação única do banco (para evitar duplicatas)
  bank_transaction_id TEXT, -- ID fornecido pelo banco
  bank_reference TEXT, -- referência/documento

  -- Reconciliação
  reconciled BOOLEAN DEFAULT false,
  reconciliation_date TIMESTAMPTZ,
  matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- transaction correspondente
  matched_invoice_payment_id UUID REFERENCES credit_card_invoices(id) ON DELETE SET NULL, -- fatura paga
  matched_transfer_id UUID REFERENCES account_transfers(id) ON DELETE SET NULL, -- transferência entre contas
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0-1, confiança do match

  -- Categorização sugerida (quando não reconciliado)
  suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  suggested_description TEXT,

  -- Metadata
  notes TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para bank_statement_items
CREATE INDEX IF NOT EXISTS idx_statement_items_user_id ON bank_statement_items(user_id);
CREATE INDEX IF NOT EXISTS idx_statement_items_bank_account_id ON bank_statement_items(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_statement_items_date ON bank_statement_items(statement_date);
CREATE INDEX IF NOT EXISTS idx_statement_items_reconciled ON bank_statement_items(reconciled);
CREATE INDEX IF NOT EXISTS idx_statement_items_bank_tx_id ON bank_statement_items(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_statement_items_matched_transaction ON bank_statement_items(matched_transaction_id);

-- ============================================
-- REGRAS DE RECONCILIAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Padrão de reconhecimento
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('description', 'amount', 'description_amount', 'reference')),
  pattern_value TEXT NOT NULL, -- regex ou valor exato
  case_sensitive BOOLEAN DEFAULT false,

  -- Ação automática
  auto_reconcile BOOLEAN DEFAULT false, -- reconciliar automaticamente?
  suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  suggested_description TEXT,

  -- Prioridade (maior = mais prioritária)
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Estatísticas
  match_count INTEGER DEFAULT 0, -- quantas vezes foi aplicada
  last_match_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_user_id ON reconciliation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_is_active ON reconciliation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_priority ON reconciliation_rules(priority DESC);

-- ============================================
-- LOG DE RECONCILIAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS reconciliation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Ação realizada
  action_type TEXT NOT NULL CHECK (action_type IN (
    'auto_match', 'manual_match', 'unmatch', 'suggest', 'import'
  )),

  -- Referências
  statement_item_id UUID REFERENCES bank_statement_items(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES reconciliation_rules(id) ON DELETE SET NULL,

  -- Detalhes
  confidence_score DECIMAL(3, 2),
  description TEXT,
  metadata JSONB, -- dados adicionais

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_log_user_id ON reconciliation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_log_action_type ON reconciliation_log(action_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_log_created_at ON reconciliation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_log_statement_item ON reconciliation_log(statement_item_id);

-- ============================================
-- IMPORTAÇÕES DE EXTRATO
-- ============================================

CREATE TABLE IF NOT EXISTS statement_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  -- Detalhes da importação
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('ofx', 'csv', 'pdf', 'api')),
  import_date TIMESTAMPTZ DEFAULT NOW(),

  -- Período do extrato
  period_start DATE,
  period_end DATE,

  -- Estatísticas
  total_items INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_duplicated INTEGER DEFAULT 0,
  items_reconciled INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_imports_user_id ON statement_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_bank_account_id ON statement_imports(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_import_date ON statement_imports(import_date DESC);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_statement_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_statement_items_updated_at ON bank_statement_items;
CREATE TRIGGER trigger_statement_items_updated_at
  BEFORE UPDATE ON bank_statement_items
  FOR EACH ROW
  EXECUTE FUNCTION update_statement_item_updated_at();

CREATE OR REPLACE FUNCTION update_reconciliation_rule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reconciliation_rules_updated_at ON reconciliation_rules;
CREATE TRIGGER trigger_reconciliation_rules_updated_at
  BEFORE UPDATE ON reconciliation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_rule_updated_at();

-- ============================================
-- TRIGGER PARA ATUALIZAR RECONCILIATION_DATE
-- ============================================

CREATE OR REPLACE FUNCTION update_reconciliation_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Se marcou como reconciliado, atualiza a data
  IF NEW.reconciled = true AND (OLD.reconciled = false OR OLD.reconciled IS NULL) THEN
    NEW.reconciliation_date = NOW();
  END IF;

  -- Se desmarcou reconciliação, limpa a data
  IF NEW.reconciled = false AND OLD.reconciled = true THEN
    NEW.reconciliation_date = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reconciliation_date ON bank_statement_items;
CREATE TRIGGER trigger_update_reconciliation_date
  BEFORE UPDATE ON bank_statement_items
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_date();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE bank_statement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY;

-- Políticas para bank_statement_items (com compartilhamento)
DROP POLICY IF EXISTS "Users can view their statement items" ON bank_statement_items;
CREATE POLICY "Users can view their statement items"
  ON bank_statement_items FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = bank_statement_items.user_id)
         OR (user2_id = auth.uid() AND user1_id = bank_statement_items.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their statement items" ON bank_statement_items;
CREATE POLICY "Users can insert their statement items"
  ON bank_statement_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their statement items" ON bank_statement_items;
CREATE POLICY "Users can update their statement items"
  ON bank_statement_items FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = bank_statement_items.user_id)
         OR (user2_id = auth.uid() AND user1_id = bank_statement_items.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their statement items" ON bank_statement_items;
CREATE POLICY "Users can delete their statement items"
  ON bank_statement_items FOR DELETE
  USING (user_id = auth.uid());

-- Políticas para reconciliation_rules
DROP POLICY IF EXISTS "Users can view their reconciliation rules" ON reconciliation_rules;
CREATE POLICY "Users can view their reconciliation rules"
  ON reconciliation_rules FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = reconciliation_rules.user_id)
         OR (user2_id = auth.uid() AND user1_id = reconciliation_rules.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their reconciliation rules" ON reconciliation_rules;
CREATE POLICY "Users can insert their reconciliation rules"
  ON reconciliation_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their reconciliation rules" ON reconciliation_rules;
CREATE POLICY "Users can update their reconciliation rules"
  ON reconciliation_rules FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their reconciliation rules" ON reconciliation_rules;
CREATE POLICY "Users can delete their reconciliation rules"
  ON reconciliation_rules FOR DELETE
  USING (user_id = auth.uid());

-- Políticas para reconciliation_log
DROP POLICY IF EXISTS "Users can view their reconciliation log" ON reconciliation_log;
CREATE POLICY "Users can view their reconciliation log"
  ON reconciliation_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = reconciliation_log.user_id)
         OR (user2_id = auth.uid() AND user1_id = reconciliation_log.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their reconciliation log" ON reconciliation_log;
CREATE POLICY "Users can insert their reconciliation log"
  ON reconciliation_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Políticas para statement_imports
DROP POLICY IF EXISTS "Users can view their statement imports" ON statement_imports;
CREATE POLICY "Users can view their statement imports"
  ON statement_imports FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = statement_imports.user_id)
         OR (user2_id = auth.uid() AND user1_id = statement_imports.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their statement imports" ON statement_imports;
CREATE POLICY "Users can insert their statement imports"
  ON statement_imports FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their statement imports" ON statement_imports;
CREATE POLICY "Users can delete their statement imports"
  ON statement_imports FOR DELETE
  USING (user_id = auth.uid());
