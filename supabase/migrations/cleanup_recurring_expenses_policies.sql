-- ============================================
-- LIMPAR POLÍTICAS DUPLICADAS DE RECURRING_EXPENSES
-- ============================================

-- Remover políticas antigas (sem compartilhamento)
DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON recurring_expenses;

-- Verificar que apenas as políticas com compartilhamento permanecem
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'recurring_expenses'
ORDER BY cmd;
