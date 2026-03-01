-- Adicionar coluna person para identificar quem do casal usa o gasto fixo
ALTER TABLE recurring_expenses
ADD COLUMN IF NOT EXISTS person VARCHAR(20) CHECK (person IN ('person1', 'person2', 'shared'));

-- Definir valor padrão para registros existentes
UPDATE recurring_expenses
SET person = 'shared'
WHERE person IS NULL;
