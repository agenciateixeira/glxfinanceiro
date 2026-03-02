-- Tabela para armazenar indicadores econômicos brasileiros
CREATE TABLE IF NOT EXISTS economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_date DATE NOT NULL UNIQUE,
  cdi_rate DECIMAL(10, 4), -- Taxa CDI mensal em %
  ipca_rate DECIMAL(10, 4), -- IPCA mensal em %
  selic_rate DECIMAL(10, 4), -- Taxa Selic mensal em %
  cdi_accumulated_12m DECIMAL(10, 4), -- CDI acumulado 12 meses
  ipca_accumulated_12m DECIMAL(10, 4), -- IPCA acumulado 12 meses
  selic_accumulated_12m DECIMAL(10, 4), -- Selic acumulado 12 meses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por data
CREATE INDEX idx_economic_indicators_date ON economic_indicators(reference_date DESC);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_economic_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_economic_indicators_updated_at
  BEFORE UPDATE ON economic_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_economic_indicators_updated_at();

-- RLS Policies (todos podem ler, apenas admin pode escrever)
ALTER TABLE economic_indicators ENABLE ROW LEVEL SECURITY;

-- Policy de leitura (todos autenticados podem ler)
CREATE POLICY "Everyone can read economic indicators"
  ON economic_indicators
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserir dados iniciais (últimos 12 meses aproximados - valores de exemplo)
-- NOTA: Estes são valores aproximados. Você deve atualizar com dados reais da API do Banco Central
INSERT INTO economic_indicators (reference_date, cdi_rate, ipca_rate, selic_rate, cdi_accumulated_12m, ipca_accumulated_12m, selic_accumulated_12m)
VALUES
  ('2024-03-01', 0.90, 0.16, 0.91, 10.65, 3.93, 10.75),
  ('2024-04-01', 0.87, 0.38, 0.88, 10.50, 3.69, 10.65),
  ('2024-05-01', 0.88, 0.46, 0.89, 10.40, 3.82, 10.50),
  ('2024-06-01', 0.89, 0.21, 0.90, 10.35, 4.23, 10.40),
  ('2024-07-01', 0.91, 0.38, 0.92, 10.45, 4.50, 10.50),
  ('2024-08-01', 0.92, -0.02, 0.93, 10.55, 4.24, 10.60),
  ('2024-09-01', 0.93, 0.44, 0.94, 10.65, 4.42, 10.70),
  ('2024-10-01', 0.94, 0.56, 0.95, 10.75, 4.76, 10.80),
  ('2024-11-01', 0.95, 0.39, 0.96, 10.85, 4.87, 10.90),
  ('2024-12-01', 0.96, 0.52, 0.97, 10.95, 4.83, 11.00),
  ('2025-01-01', 0.97, 0.16, 0.98, 11.05, 4.51, 11.10),
  ('2025-02-01', 0.98, 0.31, 0.99, 11.15, 4.35, 11.20)
ON CONFLICT (reference_date) DO NOTHING;

COMMENT ON TABLE economic_indicators IS 'Armazena indicadores econômicos brasileiros (CDI, IPCA, Selic) para comparação de performance do patrimônio';
COMMENT ON COLUMN economic_indicators.cdi_rate IS 'Taxa CDI mensal em porcentagem';
COMMENT ON COLUMN economic_indicators.ipca_rate IS 'Taxa IPCA mensal em porcentagem';
COMMENT ON COLUMN economic_indicators.selic_rate IS 'Taxa Selic mensal em porcentagem';
COMMENT ON COLUMN economic_indicators.cdi_accumulated_12m IS 'CDI acumulado nos últimos 12 meses';
COMMENT ON COLUMN economic_indicators.ipca_accumulated_12m IS 'IPCA acumulado nos últimos 12 meses';
