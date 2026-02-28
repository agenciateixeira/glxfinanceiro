-- =====================================================
-- 01 - CRIAR VIEWS PARA DASHBOARD
-- =====================================================
-- Descrição: Views otimizadas para exibir dados no dashboard
-- Ordem: Execute após criar todas as tabelas principais
-- =====================================================

-- View: Resumo mensal do usuário
CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance,
  COUNT(*) as transaction_count
FROM public.transactions
WHERE status = 'completed'
GROUP BY user_id, DATE_TRUNC('month', date);

COMMENT ON VIEW public.monthly_summary IS 'Resumo mensal de receitas, despesas e saldo por usuário';

-- View: Gastos por categoria no mês atual
CREATE OR REPLACE VIEW public.current_month_by_category AS
SELECT
  t.user_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  SUM(t.amount) as total,
  COUNT(*) as transaction_count
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
WHERE
  t.type = 'expense'
  AND t.status = 'completed'
  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY t.user_id, c.name, c.color, c.icon;

COMMENT ON VIEW public.current_month_by_category IS 'Despesas do mês atual agrupadas por categoria';

-- View: Últimas transações
CREATE OR REPLACE VIEW public.recent_transactions AS
SELECT
  t.id,
  t.user_id,
  t.description,
  t.amount,
  t.type,
  t.status,
  t.payment_method,
  t.date,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
ORDER BY t.date DESC, t.created_at DESC;

COMMENT ON VIEW public.recent_transactions IS 'Transações ordenadas por data (mais recentes primeiro)';
