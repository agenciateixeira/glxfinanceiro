-- =====================================================
-- 02 - CRIAR TABELA DE USUÁRIOS
-- =====================================================
-- Descrição: Tabela que estende auth.users com informações adicionais
-- Ordem: Execute após 01-enable-extensions.sql
-- =====================================================

-- Criar tabela de usuários públicos
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE public.users IS 'Perfil público dos usuários - estende auth.users';
COMMENT ON COLUMN public.users.id IS 'UUID do usuário - referencia auth.users(id)';
COMMENT ON COLUMN public.users.full_name IS 'Nome completo do usuário';
COMMENT ON COLUMN public.users.phone IS 'Telefone do usuário';
COMMENT ON COLUMN public.users.avatar_url IS 'URL do avatar do usuário';

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Inserir perfil automaticamente no signup
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
