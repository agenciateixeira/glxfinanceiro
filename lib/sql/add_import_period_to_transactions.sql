-- Adiciona referência ao período de importação na tabela transactions

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS import_period_id UUID REFERENCES import_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_import_period ON transactions(import_period_id);
