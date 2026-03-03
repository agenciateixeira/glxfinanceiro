-- ============================================
-- CORRIGIR HOUSEHOLD_ID DAS TRANSAÇÕES
-- ============================================

-- Problema: guilherme@agenciagtx.com.br está vendo transações do casal
-- Causa: As transações dele ainda têm household_id do casal (e939622a-7842-49bc-b546-7777f1f73dd1)
-- Solução: Atualizar household_id de TODAS as tabelas baseado no user_id

-- ============================================
-- 1. CORRIGIR HOUSEHOLD_ID EM TODAS AS TABELAS
-- ============================================

-- Criar função para corrigir household_id baseado no user_id atual
CREATE OR REPLACE FUNCTION fix_household_id_for_table(table_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Atualizar household_id para o household atual do usuário
  EXECUTE format('
    UPDATE %I t
    SET household_id = u.household_id
    FROM users u
    WHERE t.user_id = u.id
      AND t.household_id != u.household_id
      AND u.household_id IS NOT NULL
  ', table_name);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RAISE NOTICE 'Tabela %: % linhas corrigidas', table_name, rows_updated;

  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Executar para todas as tabelas
SELECT fix_household_id_for_table('categories');
SELECT fix_household_id_for_table('transactions');
SELECT fix_household_id_for_table('bank_accounts');
SELECT fix_household_id_for_table('account_transfers');
SELECT fix_household_id_for_table('recurring_expenses');
SELECT fix_household_id_for_table('financial_settings');
SELECT fix_household_id_for_table('credit_cards');
SELECT fix_household_id_for_table('credit_card_invoices');
SELECT fix_household_id_for_table('credit_card_transactions');
SELECT fix_household_id_for_table('investments');
SELECT fix_household_id_for_table('investment_history');
SELECT fix_household_id_for_table('emergency_reserve_goals');
SELECT fix_household_id_for_table('bank_statement_items');
SELECT fix_household_id_for_table('reconciliation_rules');
SELECT fix_household_id_for_table('reconciliation_log');
SELECT fix_household_id_for_table('statement_imports');

-- ============================================
-- 2. VERIFICAR RESULTADO
-- ============================================

-- Verificar se cada usuário tem suas transações no household correto
SELECT
  au.email,
  u.household_id as user_household,
  COUNT(DISTINCT t.household_id) as different_households_in_transactions,
  COUNT(t.id) as transaction_count
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN transactions t ON t.user_id = u.id
WHERE au.email IN ('guilherme@agenciagtx.com.br', 'guisdomkt@gmail.com', 'luisaazevedo1712@gmail.com')
GROUP BY au.email, u.household_id
ORDER BY au.email;

-- Mostrar resumo de households e transações
SELECT
  h.id as household_id,
  h.family_name,
  h.household_type,
  array_agg(DISTINCT au.email) as members,
  COUNT(DISTINCT t.id) as transaction_count
FROM households h
LEFT JOIN users u ON h.id = u.household_id
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN transactions t ON h.id = t.household_id
GROUP BY h.id, h.family_name, h.household_type
ORDER BY h.family_name;
