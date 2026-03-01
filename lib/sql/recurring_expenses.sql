-- Tabela para armazenar gastos fixos confirmados pelo usuário
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados do gasto fixo
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  expected_amount DECIMAL(12, 2) NOT NULL,

  -- Quando ocorre
  expected_day INTEGER CHECK (expected_day >= 1 AND expected_day <= 31),

  -- Status
  is_active BOOLEAN DEFAULT true,
  auto_detected BOOLEAN DEFAULT false, -- Se foi detectado automaticamente

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(user_id, is_active);

-- RLS Policies
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios gastos fixos
CREATE POLICY "Users can view own recurring expenses"
  ON recurring_expenses FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios gastos fixos
CREATE POLICY "Users can insert own recurring expenses"
  ON recurring_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios gastos fixos
CREATE POLICY "Users can update own recurring expenses"
  ON recurring_expenses FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios gastos fixos
CREATE POLICY "Users can delete own recurring expenses"
  ON recurring_expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_recurring_expenses_timestamp
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expenses_updated_at();
