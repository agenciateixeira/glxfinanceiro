-- Tabela para registrar períodos de importação
-- Evita duplicatas e mantém histórico de importações

CREATE TABLE IF NOT EXISTS import_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informações do período
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadados da importação
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'csv', 'xml', 'ofx')),
  bank_name TEXT,
  file_name TEXT,

  -- Estatísticas
  total_transactions INTEGER DEFAULT 0,
  total_income DECIMAL(12, 2) DEFAULT 0,
  total_expense DECIMAL(12, 2) DEFAULT 0,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Índice para buscar duplicatas rapidamente
  UNIQUE(user_id, period_start, period_end, source_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_import_periods_user_id ON import_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_import_periods_dates ON import_periods(period_start, period_end);

-- RLS Policies
ALTER TABLE import_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import periods"
  ON import_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import periods"
  ON import_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import periods"
  ON import_periods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import periods"
  ON import_periods FOR DELETE
  USING (auth.uid() = user_id);
