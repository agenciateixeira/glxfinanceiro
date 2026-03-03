-- ============================================
-- CORRIGIR VIEW RECENT_TRANSACTIONS PARA USAR HOUSEHOLD
-- ============================================

-- Problema: A view recent_transactions não tem RLS e não filtra por household_id
-- Solução: Recriar a view com household_id e adicionar RLS policy

-- ============================================
-- 1. RECRIAR A VIEW COM HOUSEHOLD_ID E BANK_ACCOUNT
-- ============================================

DROP VIEW IF EXISTS recent_transactions CASCADE;

CREATE VIEW recent_transactions AS
SELECT
  t.id,
  t.user_id,
  t.household_id,  -- IMPORTANTE: Adicionar household_id
  t.date,
  t.description,
  t.amount,
  t.type,
  t.status,
  t.payment_method,
  t.notes,
  t.created_at,
  t.bank_account_id,
  -- Dados da categoria
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  -- Dados da conta bancária
  ba.id as account_id,
  ba.name as account_name,
  ba.bank_name as account_bank_name,
  ba.account_type as account_type,
  ba.color as account_color,
  ba.icon as account_icon,
  -- Tags agregadas
  COALESCE(
    json_agg(
      json_build_object(
        'id', tags.id,
        'name', tags.name,
        'color', tags.color
      )
    ) FILTER (WHERE tags.id IS NOT NULL),
    '[]'::json
  ) as tags
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN tags ON tt.tag_id = tags.id
GROUP BY
  t.id, t.user_id, t.household_id, t.date, t.description, t.amount,
  t.type, t.status, t.payment_method, t.notes, t.created_at, t.bank_account_id,
  c.id, c.name, c.color, c.icon,
  ba.id, ba.name, ba.bank_name, ba.account_type, ba.color, ba.icon;

-- ============================================
-- 2. HABILITAR RLS NA VIEW
-- ============================================

ALTER VIEW recent_transactions SET (security_invoker = true);

-- IMPORTANTE: security_invoker = true faz a view usar as permissions do usuário
-- que está consultando, aplicando automaticamente as RLS policies da tabela transactions

-- ============================================
-- 3. ATUALIZAR OUTRAS VIEWS TAMBÉM
-- ============================================

-- Dashboard summary view
DROP VIEW IF EXISTS dashboard_summary CASCADE;

CREATE VIEW dashboard_summary AS
SELECT
  t.user_id,
  t.household_id,  -- IMPORTANTE: Adicionar household_id
  DATE_TRUNC('month', t.date) as month,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_balance,
  COUNT(*) as transaction_count
FROM transactions t
WHERE t.status = 'completed'
GROUP BY t.user_id, t.household_id, DATE_TRUNC('month', t.date);

ALTER VIEW dashboard_summary SET (security_invoker = true);

-- Category spending view
DROP VIEW IF EXISTS category_spending CASCADE;

CREATE VIEW category_spending AS
SELECT
  t.user_id,
  t.household_id,  -- IMPORTANTE: Adicionar household_id
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  DATE_TRUNC('month', t.date) as month,
  SUM(t.amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense' AND t.status = 'completed'
GROUP BY t.user_id, t.household_id, c.id, c.name, c.color, c.icon, DATE_TRUNC('month', t.date);

ALTER VIEW category_spending SET (security_invoker = true);

-- ============================================
-- 4. GARANTIR QUE A TABELA TRANSACTIONS TEM RLS HABILITADO
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verificar e recriar policies se necessário
DROP POLICY IF EXISTS "Users can view household transactions" ON transactions;
CREATE POLICY "Users can view household transactions"
  ON transactions FOR SELECT
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can insert household transactions" ON transactions;
CREATE POLICY "Users can insert household transactions"
  ON transactions FOR INSERT
  WITH CHECK (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can update household transactions" ON transactions;
CREATE POLICY "Users can update household transactions"
  ON transactions FOR UPDATE
  USING (household_id = user_household_id());

DROP POLICY IF EXISTS "Users can delete household transactions" ON transactions;
CREATE POLICY "Users can delete household transactions"
  ON transactions FOR DELETE
  USING (household_id = user_household_id());
