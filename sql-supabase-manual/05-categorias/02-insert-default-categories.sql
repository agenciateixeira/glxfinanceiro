-- =====================================================
-- 02 - INSERIR CATEGORIAS PADRÃO DO SISTEMA
-- =====================================================
-- Descrição: Categorias pré-definidas disponíveis para todos
-- Ordem: Execute após criar a tabela de categorias
-- =====================================================

-- Categorias de DESPESAS
INSERT INTO public.categories (user_id, name, color, icon, type, is_system) VALUES
  (NULL, 'Alimentação', '#FF6B6B', 'utensils', 'expense', true),
  (NULL, 'Transporte', '#4ECDC4', 'car', 'expense', true),
  (NULL, 'Moradia', '#95E1D3', 'home', 'expense', true),
  (NULL, 'Saúde', '#F38181', 'heart', 'expense', true),
  (NULL, 'Educação', '#AA96DA', 'book', 'expense', true),
  (NULL, 'Lazer', '#FCBAD3', 'gamepad', 'expense', true),
  (NULL, 'Compras', '#FFFFD2', 'shopping-bag', 'expense', true),
  (NULL, 'Contas', '#A8D8EA', 'file-text', 'expense', true),
  (NULL, 'Outros', '#D4C5B9', 'more-horizontal', 'expense', true);

-- Categorias de RECEITAS
INSERT INTO public.categories (user_id, name, color, icon, type, is_system) VALUES
  (NULL, 'Salário', '#51CF66', 'dollar-sign', 'income', true),
  (NULL, 'Freelance', '#94D82D', 'briefcase', 'income', true),
  (NULL, 'Investimentos', '#FFD43B', 'trending-up', 'income', true),
  (NULL, 'Vendas', '#FF922B', 'shopping-cart', 'income', true),
  (NULL, 'Prêmios', '#FF6B6B', 'award', 'income', true),
  (NULL, 'Outros', '#D4C5B9', 'more-horizontal', 'income', true);
