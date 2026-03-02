-- ============================================
-- SISTEMA DE CONTAS BANCÁRIAS MÚLTIPLAS
-- ============================================

-- Criar tabela de contas bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'other')),
  balance DECIMAL(15, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BRL',
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'wallet',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(user_id, is_default);

-- Adicionar coluna bank_account_id na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id ON transactions(bank_account_id);

-- Criar tabela de transferências entre contas
CREATE TABLE IF NOT EXISTS account_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que não pode transferir para a mesma conta
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

-- Criar índices para transfers
CREATE INDEX IF NOT EXISTS idx_account_transfers_user_id ON account_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_from_account ON account_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_to_account ON account_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_date ON account_transfers(transfer_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bank_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_updated_at();

-- ============================================
-- RLS POLICIES - BANK ACCOUNTS
-- ============================================

-- Habilitar RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;

-- Políticas para bank_accounts (com compartilhamento entre cônjuges)
DROP POLICY IF EXISTS "Users can view their bank accounts" ON bank_accounts;
CREATE POLICY "Users can view their bank accounts"
  ON bank_accounts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = bank_accounts.user_id)
         OR (user2_id = auth.uid() AND user1_id = bank_accounts.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert their bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their bank accounts" ON bank_accounts;
CREATE POLICY "Users can update their bank accounts"
  ON bank_accounts FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = bank_accounts.user_id)
         OR (user2_id = auth.uid() AND user1_id = bank_accounts.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete their bank accounts"
  ON bank_accounts FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = bank_accounts.user_id)
         OR (user2_id = auth.uid() AND user1_id = bank_accounts.user_id)
    )
  );

-- Políticas para account_transfers (com compartilhamento entre cônjuges)
DROP POLICY IF EXISTS "Users can view their transfers" ON account_transfers;
CREATE POLICY "Users can view their transfers"
  ON account_transfers FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = account_transfers.user_id)
         OR (user2_id = auth.uid() AND user1_id = account_transfers.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their transfers" ON account_transfers;
CREATE POLICY "Users can insert their transfers"
  ON account_transfers FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their transfers" ON account_transfers;
CREATE POLICY "Users can update their transfers"
  ON account_transfers FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = account_transfers.user_id)
         OR (user2_id = auth.uid() AND user1_id = account_transfers.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their transfers" ON account_transfers;
CREATE POLICY "Users can delete their transfers"
  ON account_transfers FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = account_transfers.user_id)
         OR (user2_id = auth.uid() AND user1_id = account_transfers.user_id)
    )
  );

-- ============================================
-- FUNÇÃO PARA ATUALIZAR SALDO DAS CONTAS
-- ============================================

-- Função para recalcular saldo de uma conta
CREATE OR REPLACE FUNCTION recalculate_account_balance(account_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  new_balance DECIMAL(15, 2);
BEGIN
  -- Calcular saldo baseado nas transações
  SELECT
    COALESCE(SUM(
      CASE
        WHEN type = 'income' THEN amount
        WHEN type = 'expense' THEN -amount
        ELSE 0
      END
    ), 0)
  INTO new_balance
  FROM transactions
  WHERE bank_account_id = account_id;

  -- Adicionar transferências recebidas
  new_balance := new_balance + COALESCE((
    SELECT SUM(amount)
    FROM account_transfers
    WHERE to_account_id = account_id
  ), 0);

  -- Subtrair transferências enviadas
  new_balance := new_balance - COALESCE((
    SELECT SUM(amount)
    FROM account_transfers
    WHERE from_account_id = account_id
  ), 0);

  -- Atualizar o saldo da conta
  UPDATE bank_accounts
  SET balance = new_balance, updated_at = NOW()
  WHERE id = account_id;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS PARA ATUALIZAR SALDO AUTOMATICAMENTE
-- ============================================

-- Trigger para transações
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar conta anterior se mudou de conta
  IF TG_OP = 'UPDATE' AND OLD.bank_account_id IS NOT NULL AND OLD.bank_account_id != NEW.bank_account_id THEN
    PERFORM recalculate_account_balance(OLD.bank_account_id);
  END IF;

  -- Atualizar conta anterior se deletou
  IF TG_OP = 'DELETE' AND OLD.bank_account_id IS NOT NULL THEN
    PERFORM recalculate_account_balance(OLD.bank_account_id);
    RETURN OLD;
  END IF;

  -- Atualizar conta atual
  IF NEW.bank_account_id IS NOT NULL THEN
    PERFORM recalculate_account_balance(NEW.bank_account_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_transaction();

-- Trigger para transferências
CREATE OR REPLACE FUNCTION update_account_balance_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_account_balance(OLD.from_account_id);
    PERFORM recalculate_account_balance(OLD.to_account_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar contas antigas se mudaram
    IF OLD.from_account_id != NEW.from_account_id THEN
      PERFORM recalculate_account_balance(OLD.from_account_id);
    END IF;
    IF OLD.to_account_id != NEW.to_account_id THEN
      PERFORM recalculate_account_balance(OLD.to_account_id);
    END IF;
  END IF;

  -- Atualizar contas novas
  PERFORM recalculate_account_balance(NEW.from_account_id);
  PERFORM recalculate_account_balance(NEW.to_account_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_account_balance_transfer ON account_transfers;
CREATE TRIGGER trigger_update_account_balance_transfer
  AFTER INSERT OR UPDATE OR DELETE ON account_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_transfer();

-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('bank_accounts', 'account_transfers');
