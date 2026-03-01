-- ============================================
-- COMPARTILHAR RECURRING_EXPENSES ENTRE CÔNJUGES
-- ============================================

-- Atualizar políticas para recurring_expenses
DROP POLICY IF EXISTS "Users can view their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can view their recurring expenses"
  ON recurring_expenses
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = recurring_expenses.user_id)
         OR (user2_id = auth.uid() AND user1_id = recurring_expenses.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can insert their recurring expenses"
  ON recurring_expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can update their recurring expenses"
  ON recurring_expenses
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = recurring_expenses.user_id)
         OR (user2_id = auth.uid() AND user1_id = recurring_expenses.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can delete their recurring expenses"
  ON recurring_expenses
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = recurring_expenses.user_id)
         OR (user2_id = auth.uid() AND user1_id = recurring_expenses.user_id)
    )
  );

-- Verificar políticas
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'recurring_expenses'
ORDER BY cmd;
