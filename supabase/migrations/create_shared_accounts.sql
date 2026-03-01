-- Tabela para vincular contas de cônjuges
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
CREATE POLICY "Users can view their shared accounts"
  ON shared_accounts
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: usuários podem criar vínculos
CREATE POLICY "Users can create shared accounts"
  ON shared_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: usuários podem deletar seus vínculos
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

-- Atualizar RLS policies das tabelas principais para incluir acesso compartilhado

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

-- GOALS (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'goals') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their goals" ON goals';
    EXECUTE 'CREATE POLICY "Users can view their goals"
      ON goals
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR user_id = get_linked_user_id(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their goals" ON goals';
    EXECUTE 'CREATE POLICY "Users can insert their goals"
      ON goals
      FOR INSERT
      WITH CHECK (user_id = auth.uid())';

    EXECUTE 'DROP POLICY IF EXISTS "Users can update their goals" ON goals';
    EXECUTE 'CREATE POLICY "Users can update their goals"
      ON goals
      FOR UPDATE
      USING (
        user_id = auth.uid()
        OR user_id = get_linked_user_id(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their goals" ON goals';
    EXECUTE 'CREATE POLICY "Users can delete their goals"
      ON goals
      FOR DELETE
      USING (
        user_id = auth.uid()
        OR user_id = get_linked_user_id(auth.uid())
      )';
  END IF;
END $$;
