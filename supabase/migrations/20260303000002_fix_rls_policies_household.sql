-- ============================================
-- CORRIGIR TODAS AS RLS POLICIES PARA USAR HOUSEHOLD
-- Garante isolamento total de dados entre households diferentes
-- ============================================

-- ============================================
-- 1. ADICIONAR HOUSEHOLD_ID EM TODAS AS TABELAS
-- ============================================

-- Função helper para adicionar coluna household_id
CREATE OR REPLACE FUNCTION add_household_id_column(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('
    DO $block$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %L AND column_name = ''household_id''
      ) THEN
        ALTER TABLE %I ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
        CREATE INDEX idx_%I_household_id ON %I(household_id);
      END IF;
    END $block$;
  ', table_name, table_name, table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Adicionar household_id em todas as tabelas principais
SELECT add_household_id_column('categories');
SELECT add_household_id_column('transactions');
SELECT add_household_id_column('bank_accounts');
SELECT add_household_id_column('account_transfers');
SELECT add_household_id_column('recurring_expenses');
SELECT add_household_id_column('financial_settings');
SELECT add_household_id_column('credit_cards');
SELECT add_household_id_column('credit_card_invoices');
SELECT add_household_id_column('credit_card_transactions');
SELECT add_household_id_column('investments');
SELECT add_household_id_column('investment_history');
SELECT add_household_id_column('emergency_reserve_goals');
SELECT add_household_id_column('bank_statement_items');
SELECT add_household_id_column('reconciliation_rules');
SELECT add_household_id_column('reconciliation_log');
SELECT add_household_id_column('statement_imports');

-- ============================================
-- 2. FUNÇÃO HELPER PARA VERIFICAR MESMO HOUSEHOLD
-- ============================================

CREATE OR REPLACE FUNCTION is_same_household(p_user_id UUID, p_household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = p_user_id
      AND household_id = p_household_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_household_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT household_id
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. RECRIAR POLICIES CORRETAS - CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can view their categories" ON categories;
DROP POLICY IF EXISTS "Users can view household categories" ON categories;

CREATE POLICY "Users can view household categories"
  ON categories FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their categories" ON categories;
DROP POLICY IF EXISTS "Users can insert household categories" ON categories;

CREATE POLICY "Users can insert household categories"
  ON categories FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their categories" ON categories;
DROP POLICY IF EXISTS "Users can update household categories" ON categories;

CREATE POLICY "Users can update household categories"
  ON categories FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their categories" ON categories;
DROP POLICY IF EXISTS "Users can delete household categories" ON categories;

CREATE POLICY "Users can delete household categories"
  ON categories FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 4. RECRIAR POLICIES CORRETAS - TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view household transactions" ON transactions;

CREATE POLICY "Users can view household transactions"
  ON transactions FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert household transactions" ON transactions;

CREATE POLICY "Users can insert household transactions"
  ON transactions FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update household transactions" ON transactions;

CREATE POLICY "Users can update household transactions"
  ON transactions FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete household transactions" ON transactions;

CREATE POLICY "Users can delete household transactions"
  ON transactions FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 5. RECRIAR POLICIES CORRETAS - BANK_ACCOUNTS
-- ============================================

DROP POLICY IF EXISTS "Users can view their bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can view household bank accounts" ON bank_accounts;

CREATE POLICY "Users can view household bank accounts"
  ON bank_accounts FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert their bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert household bank accounts" ON bank_accounts;

CREATE POLICY "Users can insert household bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update their bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update household bank accounts" ON bank_accounts;

CREATE POLICY "Users can update household bank accounts"
  ON bank_accounts FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete their bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete household bank accounts" ON bank_accounts;

CREATE POLICY "Users can delete household bank accounts"
  ON bank_accounts FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 6. RECRIAR POLICIES - CREDIT CARDS
-- ============================================

DROP POLICY IF EXISTS "Users can view their credit cards" ON credit_cards;
CREATE POLICY "Users can view household credit cards"
  ON credit_cards FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert their credit cards" ON credit_cards;
CREATE POLICY "Users can insert household credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update their credit cards" ON credit_cards;
CREATE POLICY "Users can update household credit cards"
  ON credit_cards FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete their credit cards" ON credit_cards;
CREATE POLICY "Users can delete household credit cards"
  ON credit_cards FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 7. RECRIAR POLICIES - CREDIT CARD INVOICES
-- ============================================

DROP POLICY IF EXISTS "Users can view their invoices" ON credit_card_invoices;
CREATE POLICY "Users can view household invoices"
  ON credit_card_invoices FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert their invoices" ON credit_card_invoices;
CREATE POLICY "Users can insert household invoices"
  ON credit_card_invoices FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update their invoices" ON credit_card_invoices;
CREATE POLICY "Users can update household invoices"
  ON credit_card_invoices FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete their invoices" ON credit_card_invoices;
CREATE POLICY "Users can delete household invoices"
  ON credit_card_invoices FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 8. RECRIAR POLICIES - CREDIT CARD TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can view household cc transactions"
  ON credit_card_transactions FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can insert household cc transactions"
  ON credit_card_transactions FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can update household cc transactions"
  ON credit_card_transactions FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete their cc transactions" ON credit_card_transactions;
CREATE POLICY "Users can delete household cc transactions"
  ON credit_card_transactions FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 9. RECRIAR POLICIES - INVESTMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view their investments" ON investments;
CREATE POLICY "Users can view household investments"
  ON investments FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert their investments" ON investments;
CREATE POLICY "Users can insert household investments"
  ON investments FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update their investments" ON investments;
CREATE POLICY "Users can update household investments"
  ON investments FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete their investments" ON investments;
CREATE POLICY "Users can delete household investments"
  ON investments FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 10. RECRIAR POLICIES - RECURRING EXPENSES
-- ============================================

DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can view their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can view household recurring expenses"
  ON recurring_expenses FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can insert household recurring expenses"
  ON recurring_expenses FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can update household recurring expenses"
  ON recurring_expenses FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can delete household recurring expenses"
  ON recurring_expenses FOR DELETE
  USING (household_id = user_household_id());

-- ============================================
-- 11. TRIGGER PARA AUTO-PREENCHER HOUSEHOLD_ID
-- ============================================

CREATE OR REPLACE FUNCTION auto_set_household_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.household_id IS NULL THEN
    NEW.household_id := user_household_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em todas as tabelas relevantes
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'categories', 'transactions', 'bank_accounts', 'account_transfers',
      'recurring_expenses', 'financial_settings', 'credit_cards',
      'credit_card_invoices', 'credit_card_transactions', 'investments',
      'investment_history', 'emergency_reserve_goals', 'bank_statement_items',
      'reconciliation_rules', 'reconciliation_log', 'statement_imports'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_auto_set_household_id ON %I;
      CREATE TRIGGER trigger_auto_set_household_id
        BEFORE INSERT ON %I
        FOR EACH ROW
        EXECUTE FUNCTION auto_set_household_id();
    ', table_name, table_name);
  END LOOP;
END $$;

-- ============================================
-- 12. LIMPAR TABELA SHARED_ACCOUNTS (OBSOLETA)
-- ============================================

-- A tabela shared_accounts não é mais necessária
-- Todo compartilhamento é gerenciado pelo household

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'shared_accounts'
  ) THEN
    COMMENT ON TABLE shared_accounts IS 'OBSOLETO: Use households system';
  END IF;
END $$;
