-- =====================================================
-- 01 - CRIAR TABELA DE CATEGORIAS
-- =====================================================
-- Descrição: Categorias para organizar transações
-- Ordem: Execute ANTES de criar transações
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#D4C5B9',
  icon VARCHAR(50),
  type transaction_type NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Comentários
COMMENT ON TABLE public.categories IS 'Categorias de transações (podem ser do sistema ou do usuário)';
COMMENT ON COLUMN public.categories.user_id IS 'NULL para categorias do sistema, UUID para categorias do usuário';
COMMENT ON COLUMN public.categories.is_system IS 'true para categorias padrão do sistema';
COMMENT ON COLUMN public.categories.color IS 'Cor em hexadecimal (#RRGGBB)';

-- Índices
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_type ON public.categories(type);

-- Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view system categories and their own"
  ON public.categories
  FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own categories"
  ON public.categories
  FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own categories"
  ON public.categories
  FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);
