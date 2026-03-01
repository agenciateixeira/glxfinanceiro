-- ============================================
-- FIX: Políticas RLS com abordagem diferente
-- Problema: a função get_linked_user_id pode não estar sendo chamada corretamente
-- Solução: Usar uma abordagem com EXISTS e subquery
-- ============================================

-- TRANSACTIONS - Nova abordagem
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions"
  ON transactions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = transactions.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their transactions" ON transactions;
CREATE POLICY "Users can insert their transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = transactions.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
CREATE POLICY "Users can update their transactions"
  ON transactions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = transactions.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
CREATE POLICY "Users can delete their transactions"
  ON transactions
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = transactions.user_id)
         OR (user2_id = auth.uid() AND user1_id = transactions.user_id)
    )
  );

-- CATEGORIES - Nova abordagem
DROP POLICY IF EXISTS "Users can view their categories" ON categories;
CREATE POLICY "Users can view their categories"
  ON categories
  FOR SELECT
  USING (
    is_system = true
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = categories.user_id)
         OR (user2_id = auth.uid() AND user1_id = categories.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their categories" ON categories;
CREATE POLICY "Users can update their categories"
  ON categories
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = categories.user_id)
         OR (user2_id = auth.uid() AND user1_id = categories.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their categories" ON categories;
CREATE POLICY "Users can delete their categories"
  ON categories
  FOR DELETE
  USING (
    is_system = false
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM shared_accounts
        WHERE (user1_id = auth.uid() AND user2_id = categories.user_id)
           OR (user2_id = auth.uid() AND user1_id = categories.user_id)
      )
    )
  );

-- TAGS - Nova abordagem
DROP POLICY IF EXISTS "Users can view their tags" ON tags;
CREATE POLICY "Users can view their tags"
  ON tags
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = tags.user_id)
         OR (user2_id = auth.uid() AND user1_id = tags.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their tags" ON tags;
CREATE POLICY "Users can update their tags"
  ON tags
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = tags.user_id)
         OR (user2_id = auth.uid() AND user1_id = tags.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their tags" ON tags;
CREATE POLICY "Users can delete their tags"
  ON tags
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = tags.user_id)
         OR (user2_id = auth.uid() AND user1_id = tags.user_id)
    )
  );

-- GOALS - Nova abordagem
DROP POLICY IF EXISTS "Users can view their goals" ON goals;
CREATE POLICY "Users can view their goals"
  ON goals
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = goals.user_id)
         OR (user2_id = auth.uid() AND user1_id = goals.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their goals" ON goals;
CREATE POLICY "Users can update their goals"
  ON goals
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = goals.user_id)
         OR (user2_id = auth.uid() AND user1_id = goals.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their goals" ON goals;
CREATE POLICY "Users can delete their goals"
  ON goals
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = goals.user_id)
         OR (user2_id = auth.uid() AND user1_id = goals.user_id)
    )
  );

-- TRANSACTION_TAGS - Nova abordagem
DROP POLICY IF EXISTS "Users can view transaction tags" ON transaction_tags;
CREATE POLICY "Users can view transaction tags"
  ON transaction_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared_accounts
            WHERE (user1_id = auth.uid() AND user2_id = t.user_id)
               OR (user2_id = auth.uid() AND user1_id = t.user_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert transaction tags" ON transaction_tags;
CREATE POLICY "Users can insert transaction tags"
  ON transaction_tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared_accounts
            WHERE (user1_id = auth.uid() AND user2_id = t.user_id)
               OR (user2_id = auth.uid() AND user1_id = t.user_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete transaction tags" ON transaction_tags;
CREATE POLICY "Users can delete transaction tags"
  ON transaction_tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared_accounts
            WHERE (user1_id = auth.uid() AND user2_id = t.user_id)
               OR (user2_id = auth.uid() AND user1_id = t.user_id)
          )
        )
    )
  );

-- Verificação final
SELECT 'Políticas atualizadas com sucesso!' as status;

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('transactions', 'categories', 'tags', 'goals', 'transaction_tags')
ORDER BY tablename, cmd;
