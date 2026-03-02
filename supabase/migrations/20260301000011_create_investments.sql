-- ============================================
-- SISTEMA DE INVESTIMENTOS
-- ============================================

-- Criar tabela de investimentos
CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Informações do investimento
  investment_name TEXT NOT NULL,
  investment_type TEXT NOT NULL CHECK (investment_type IN (
    'cdb', 'lci', 'lca', 'tesouro_selic', 'tesouro_ipca', 'tesouro_prefixado',
    'acoes', 'fundos_imobiliarios', 'fundos_investimento', 'previdencia',
    'poupanca', 'outros'
  )),
  institution TEXT, -- banco/corretora

  -- Valores
  invested_value DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- quanto investiu
  current_value DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- valor atual
  yield_percentage DECIMAL(8, 4), -- rendimento percentual

  -- Datas
  investment_date DATE, -- data do investimento inicial
  maturity_date DATE, -- data de vencimento (se aplicável)
  last_update_date DATE DEFAULT CURRENT_DATE, -- última atualização do valor

  -- Classificação
  is_emergency_reserve BOOLEAN DEFAULT false, -- faz parte da reserva de emergência?
  liquidity TEXT CHECK (liquidity IN ('daily', 'monthly', 'maturity', 'low')), -- liquidez
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')), -- nível de risco

  -- Metadata
  notes TEXT,
  color TEXT DEFAULT '#10B981',
  icon TEXT DEFAULT 'trending-up',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para investments
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(investment_type);
CREATE INDEX IF NOT EXISTS idx_investments_is_emergency ON investments(is_emergency_reserve);
CREATE INDEX IF NOT EXISTS idx_investments_is_active ON investments(is_active);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON investments(maturity_date);

-- ============================================
-- HISTÓRICO DE RENTABILIDADE
-- ============================================

CREATE TABLE IF NOT EXISTS investment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value DECIMAL(15, 2) NOT NULL, -- valor naquela data
  yield_percentage DECIMAL(8, 4), -- rendimento acumulado
  daily_yield DECIMAL(8, 4), -- rendimento do dia

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir um registro por dia por investimento
  CONSTRAINT unique_investment_history UNIQUE (investment_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_investment_history_investment_id ON investment_history(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_history_record_date ON investment_history(record_date);

-- ============================================
-- METAS DE RESERVA DE EMERGÊNCIA
-- ============================================

CREATE TABLE IF NOT EXISTS emergency_reserve_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Meta
  target_months INTEGER DEFAULT 6 CHECK (target_months >= 1), -- quantos meses de despesas
  target_amount DECIMAL(15, 2), -- valor total da meta (calculado ou manual)
  current_amount DECIMAL(15, 2) DEFAULT 0.00, -- quanto já tem

  -- Cálculo automático
  auto_calculate BOOLEAN DEFAULT true, -- calcular baseado em gastos fixos?
  monthly_expense_base DECIMAL(15, 2), -- base de cálculo mensal

  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir uma meta ativa por usuário
  CONSTRAINT unique_active_goal_per_user UNIQUE (user_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_emergency_goals_user_id ON emergency_reserve_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_goals_is_active ON emergency_reserve_goals(is_active);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Trigger para investments
CREATE OR REPLACE FUNCTION update_investment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_investments_updated_at ON investments;
CREATE TRIGGER trigger_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_updated_at();

-- Trigger para emergency_reserve_goals
CREATE OR REPLACE FUNCTION update_emergency_goal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_emergency_goals_updated_at ON emergency_reserve_goals;
CREATE TRIGGER trigger_emergency_goals_updated_at
  BEFORE UPDATE ON emergency_reserve_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_goal_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_reserve_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para investments (com compartilhamento entre cônjuges)
DROP POLICY IF EXISTS "Users can view their investments" ON investments;
CREATE POLICY "Users can view their investments"
  ON investments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = investments.user_id)
         OR (user2_id = auth.uid() AND user1_id = investments.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their investments" ON investments;
CREATE POLICY "Users can insert their investments"
  ON investments FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their investments" ON investments;
CREATE POLICY "Users can update their investments"
  ON investments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = investments.user_id)
         OR (user2_id = auth.uid() AND user1_id = investments.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their investments" ON investments;
CREATE POLICY "Users can delete their investments"
  ON investments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = investments.user_id)
         OR (user2_id = auth.uid() AND user1_id = investments.user_id)
    )
  );

-- Políticas para investment_history
DROP POLICY IF EXISTS "Users can view their investment history" ON investment_history;
CREATE POLICY "Users can view their investment history"
  ON investment_history FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = investment_history.user_id)
         OR (user2_id = auth.uid() AND user1_id = investment_history.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their investment history" ON investment_history;
CREATE POLICY "Users can insert their investment history"
  ON investment_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their investment history" ON investment_history;
CREATE POLICY "Users can delete their investment history"
  ON investment_history FOR DELETE
  USING (user_id = auth.uid());

-- Políticas para emergency_reserve_goals
DROP POLICY IF EXISTS "Users can view their emergency goals" ON emergency_reserve_goals;
CREATE POLICY "Users can view their emergency goals"
  ON emergency_reserve_goals FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = emergency_reserve_goals.user_id)
         OR (user2_id = auth.uid() AND user1_id = emergency_reserve_goals.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert their emergency goals" ON emergency_reserve_goals;
CREATE POLICY "Users can insert their emergency goals"
  ON emergency_reserve_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their emergency goals" ON emergency_reserve_goals;
CREATE POLICY "Users can update their emergency goals"
  ON emergency_reserve_goals FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (user1_id = auth.uid() AND user2_id = emergency_reserve_goals.user_id)
         OR (user2_id = auth.uid() AND user1_id = emergency_reserve_goals.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their emergency goals" ON emergency_reserve_goals;
CREATE POLICY "Users can delete their emergency goals"
  ON emergency_reserve_goals FOR DELETE
  USING (user_id = auth.uid());
