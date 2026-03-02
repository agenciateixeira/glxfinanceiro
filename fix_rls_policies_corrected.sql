-- Ativar RLS nas tabelas
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can view spouse bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;

DROP POLICY IF EXISTS "Users can view own transfers" ON account_transfers;
DROP POLICY IF EXISTS "Users can view spouse transfers" ON account_transfers;
DROP POLICY IF EXISTS "Users can insert own transfers" ON account_transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON account_transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON account_transfers;

-- Políticas para bank_accounts
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view spouse bank accounts"
  ON bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (shared_accounts.user1_id = auth.uid() AND shared_accounts.user2_id = bank_accounts.user_id)
         OR (shared_accounts.user2_id = auth.uid() AND shared_accounts.user1_id = bank_accounts.user_id)
    )
  );

CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para account_transfers
CREATE POLICY "Users can view own transfers"
  ON account_transfers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view spouse transfers"
  ON account_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (shared_accounts.user1_id = auth.uid() AND shared_accounts.user2_id = account_transfers.user_id)
         OR (shared_accounts.user2_id = auth.uid() AND shared_accounts.user1_id = account_transfers.user_id)
    )
  );

CREATE POLICY "Users can insert own transfers"
  ON account_transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfers"
  ON account_transfers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
  ON account_transfers FOR DELETE
  USING (auth.uid() = user_id);
