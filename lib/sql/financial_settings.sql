-- Tabela de configurações financeiras do casal
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pessoa 1
  person1_name TEXT,
  person1_salary DECIMAL(12, 2),
  person1_payment_day INTEGER CHECK (person1_payment_day >= 1 AND person1_payment_day <= 31),
  person1_tax_rate DECIMAL(5, 2), -- Porcentagem de impostos

  -- Pessoa 2
  person2_name TEXT,
  person2_salary DECIMAL(12, 2),
  person2_payment_day INTEGER CHECK (person2_payment_day >= 1 AND person2_payment_day <= 31),
  person2_tax_rate DECIMAL(5, 2),

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Garante que cada usuário tenha apenas uma configuração
  UNIQUE(user_id)
);

-- Índice para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_financial_settings_user ON financial_settings(user_id);

-- RLS Policies
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas suas próprias configurações
CREATE POLICY "Users can view own financial settings"
  ON financial_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir suas próprias configurações
CREATE POLICY "Users can insert own financial settings"
  ON financial_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar suas próprias configurações
CREATE POLICY "Users can update own financial settings"
  ON financial_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuários podem deletar suas próprias configurações
CREATE POLICY "Users can delete own financial settings"
  ON financial_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_financial_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_settings_timestamp
  BEFORE UPDATE ON financial_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_settings_updated_at();
