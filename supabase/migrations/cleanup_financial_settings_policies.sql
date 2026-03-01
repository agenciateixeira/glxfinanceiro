-- ============================================
-- LIMPAR POLÍTICAS DUPLICADAS DE FINANCIAL_SETTINGS
-- ============================================

-- Remover políticas antigas (sem compartilhamento)
DROP POLICY IF EXISTS "Users can view own financial settings" ON financial_settings;
DROP POLICY IF EXISTS "Users can insert own financial settings" ON financial_settings;
DROP POLICY IF EXISTS "Users can update own financial settings" ON financial_settings;
DROP POLICY IF EXISTS "Users can delete own financial settings" ON financial_settings;

-- Verificar que apenas as políticas com compartilhamento permanecem
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'financial_settings'
ORDER BY cmd;
