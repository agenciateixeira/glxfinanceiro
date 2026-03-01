-- ============================================
-- VERIFICAÇÃO E APLICAÇÃO DAS POLÍTICAS RLS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR SE A TABELA shared_accounts EXISTE
SELECT 'shared_accounts table exists: ' || EXISTS(
  SELECT FROM pg_tables WHERE tablename = 'shared_accounts'
)::text as status;

-- 2. VERIFICAR SE AS FUNÇÕES EXISTEM
SELECT 'get_linked_user_id function exists: ' || EXISTS(
  SELECT FROM pg_proc WHERE proname = 'get_linked_user_id'
)::text as status;

SELECT 'are_users_linked function exists: ' || EXISTS(
  SELECT FROM pg_proc WHERE proname = 'are_users_linked'
)::text as status;

-- 3. LISTAR POLÍTICAS ATUAIS DE TRANSACTIONS
SELECT
  'Current RLS policies on transactions:' as info,
  policyname,
  cmd as command,
  qual::text as using_expression
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- 4. VERIFICAR SE O CÔNJUGE TEM ACESSO (substitua os IDs)
-- Exemplo: SELECT get_linked_user_id('4ea26367-1eae-4c9b-9b26-ea38d575f2b1'::uuid);

-- ============================================
-- SE AS POLÍTICAS NÃO EXISTIREM, EXECUTE ABAIXO
-- ============================================

-- Criar tabela shared_accounts se não existir
CREATE TABLE IF NOT EXISTS shared_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Index para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_shared_accounts_user1 ON shared_accounts(user1_id);
CREATE INDEX IF NOT EXISTS idx_shared_accounts_user2 ON shared_accounts(user2_id);

-- RLS (Row Level Security)
ALTER TABLE shared_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver seus próprios vínculos
DROP POLICY IF EXISTS "Users can view their shared accounts" ON shared_accounts;
CREATE POLICY "Users can view their shared accounts"
  ON shared_accounts
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: usuários podem criar vínculos
DROP POLICY IF EXISTS "Users can create shared accounts" ON shared_accounts;
CREATE POLICY "Users can create shared accounts"
  ON shared_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: usuários podem deletar seus vínculos
DROP POLICY IF EXISTS "Users can delete their shared accounts" ON shared_accounts;
CREATE POLICY "Users can delete their shared accounts"
  ON shared_accounts
  FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Função helper para verificar se dois usuários compartilham conta
CREATE OR REPLACE FUNCTION are_users_linked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_accounts
    WHERE (user1_id = user_a AND user2_id = user_b)
       OR (user1_id = user_b AND user2_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o ID do parceiro vinculado
CREATE OR REPLACE FUNCTION get_linked_user_id(requesting_user_id UUID)
RETURNS UUID AS $$
DECLARE
  linked_id UUID;
BEGIN
  SELECT CASE
    WHEN user1_id = requesting_user_id THEN user2_id
    WHEN user2_id = requesting_user_id THEN user1_id
  END INTO linked_id
  FROM shared_accounts
  WHERE user1_id = requesting_user_id OR user2_id = requesting_user_id
  LIMIT 1;

  RETURN linked_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ATUALIZAR POLÍTICAS DAS TABELAS PRINCIPAIS
-- ============================================

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions"
  ON transactions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their transactions" ON transactions;
CREATE POLICY "Users can insert their transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
CREATE POLICY "Users can update their transactions"
  ON transactions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
CREATE POLICY "Users can delete their transactions"
  ON transactions
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view their categories" ON categories;
CREATE POLICY "Users can view their categories"
  ON categories
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
    OR is_system = true
  );

DROP POLICY IF EXISTS "Users can insert their categories" ON categories;
CREATE POLICY "Users can insert their categories"
  ON categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their categories" ON categories;
CREATE POLICY "Users can update their categories"
  ON categories
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their categories" ON categories;
CREATE POLICY "Users can delete their categories"
  ON categories
  FOR DELETE
  USING (
    (user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid()))
    AND is_system = false
  );

-- TAGS
DROP POLICY IF EXISTS "Users can view their tags" ON tags;
CREATE POLICY "Users can view their tags"
  ON tags
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their tags" ON tags;
CREATE POLICY "Users can insert their tags"
  ON tags
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their tags" ON tags;
CREATE POLICY "Users can update their tags"
  ON tags
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their tags" ON tags;
CREATE POLICY "Users can delete their tags"
  ON tags
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

-- GOALS
DROP POLICY IF EXISTS "Users can view their goals" ON goals;
CREATE POLICY "Users can view their goals"
  ON goals
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their goals" ON goals;
CREATE POLICY "Users can insert their goals"
  ON goals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their goals" ON goals;
CREATE POLICY "Users can update their goals"
  ON goals
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their goals" ON goals;
CREATE POLICY "Users can delete their goals"
  ON goals
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id = get_linked_user_id(auth.uid())
  );

-- TRANSACTION_TAGS (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'transaction_tags') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view transaction tags" ON transaction_tags';
    EXECUTE 'CREATE POLICY "Users can view transaction tags"
      ON transaction_tags
      FOR SELECT
      USING (
        transaction_id IN (
          SELECT id FROM transactions
          WHERE user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid())
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can insert transaction tags" ON transaction_tags';
    EXECUTE 'CREATE POLICY "Users can insert transaction tags"
      ON transaction_tags
      FOR INSERT
      WITH CHECK (
        transaction_id IN (
          SELECT id FROM transactions
          WHERE user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid())
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can delete transaction tags" ON transaction_tags';
    EXECUTE 'CREATE POLICY "Users can delete transaction tags"
      ON transaction_tags
      FOR DELETE
      USING (
        transaction_id IN (
          SELECT id FROM transactions
          WHERE user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid())
        )
      )';
  END IF;
END $$;

-- TRANSACTION_LEARNING (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'transaction_learning') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their learning data" ON transaction_learning';
    EXECUTE 'CREATE POLICY "Users can view their learning data"
      ON transaction_learning
      FOR SELECT
      USING (
        user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their learning data" ON transaction_learning';
    EXECUTE 'CREATE POLICY "Users can insert their learning data"
      ON transaction_learning
      FOR INSERT
      WITH CHECK (user_id = auth.uid())';

    EXECUTE 'DROP POLICY IF EXISTS "Users can update their learning data" ON transaction_learning';
    EXECUTE 'CREATE POLICY "Users can update their learning data"
      ON transaction_learning
      FOR UPDATE
      USING (
        user_id = auth.uid() OR user_id = get_linked_user_id(auth.uid())
      )';
  END IF;
END $$;

-- VERIFICAÇÃO FINAL
SELECT 'Verification complete. Check policies:' as status;

SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('transactions', 'categories', 'tags', 'goals', 'transaction_tags', 'transaction_learning')
ORDER BY tablename, policyname;
