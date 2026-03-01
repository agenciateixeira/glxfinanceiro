-- ============================================
-- COMPARTILHAR FINANCIAL_SETTINGS ENTRE CÔNJUGES
-- ============================================

-- Atualizar políticas para financial_settings
DROP POLICY IF EXISTS "Users can view their financial settings" ON financial_settings;
CREATE POLICY "Users can view their financial settings"
  ON financial_settings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = financial_settings.user_id)
         OR (user2_id = auth.uid() AND user1_id = financial_settings.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their financial settings" ON financial_settings;
CREATE POLICY "Users can insert their financial settings"
  ON financial_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their financial settings" ON financial_settings;
CREATE POLICY "Users can update their financial settings"
  ON financial_settings
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = financial_settings.user_id)
         OR (user2_id = auth.uid() AND user1_id = financial_settings.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their financial settings" ON financial_settings;
CREATE POLICY "Users can delete their financial settings"
  ON financial_settings
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = financial_settings.user_id)
         OR (user2_id = auth.uid() AND user1_id = financial_settings.user_id)
    )
  );

-- Verificar políticas
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'financial_settings'
ORDER BY cmd;
