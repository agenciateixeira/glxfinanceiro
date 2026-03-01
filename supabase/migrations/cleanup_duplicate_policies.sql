-- ============================================
-- LIMPAR POLÍTICAS DUPLICADAS
-- Remove as políticas antigas que NÃO incluem compartilhamento
-- Mantém apenas as políticas novas com get_linked_user_id()
-- ============================================

-- TRANSACTIONS - Remove políticas antigas
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- CATEGORIES - Remove políticas antigas
DROP POLICY IF EXISTS "Users can view system categories and their own" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

-- TAGS - Remove políticas antigas
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can create own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

-- GOALS - Remove políticas antigas
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;

-- TRANSACTION_TAGS - Remove políticas antigas
DROP POLICY IF EXISTS "Users can view own transaction_tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can insert own transaction_tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can create own transaction_tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can delete own transaction_tags" ON transaction_tags;

-- ============================================
-- VERIFICAÇÃO FINAL - Deve mostrar apenas 1 policy de cada tipo
-- ============================================
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('transactions', 'categories', 'tags', 'goals', 'transaction_tags', 'transaction_learning')
ORDER BY tablename, command, policyname;

-- Contar políticas por tabela (deve ser 4 para a maioria: SELECT, INSERT, UPDATE, DELETE)
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('transactions', 'categories', 'tags', 'goals', 'transaction_tags')
GROUP BY tablename
ORDER BY tablename;
