-- =====================================================
-- 01 - CRIAR TABELA DE METAS FINANCEIRAS
-- =====================================================
-- Descrição: Metas e objetivos financeiros dos usuários
-- Ordem: Execute após criar usuários
-- =====================================================

CREATE TYPE goal_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE,
  status goal_status DEFAULT 'active',
  color VARCHAR(7) DEFAULT '#D4C5B9',
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Comentários
COMMENT ON TABLE public.goals IS 'Metas financeiras dos usuários';
COMMENT ON COLUMN public.goals.target_amount IS 'Valor alvo da meta';
COMMENT ON COLUMN public.goals.current_amount IS 'Valor atual economizado';
COMMENT ON COLUMN public.goals.target_date IS 'Data alvo para atingir a meta';

-- Índices
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);

-- Habilitar RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own goals"
  ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);
