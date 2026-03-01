-- Tabela de aprendizado de transações
-- Armazena padrões de classificação para auto-sugestão

CREATE TABLE IF NOT EXISTS transaction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Padrão de identificação da transação
  description_pattern TEXT NOT NULL, -- Ex: "Transferência recebida pelo Pix SILVANA"
  normalized_pattern TEXT NOT NULL, -- Versão normalizada (sem números, lowercase)

  -- Classificação aprendida
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Metadados
  confidence_score INTEGER DEFAULT 1, -- Quantas vezes foi usado
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX idx_transaction_patterns_user_id ON transaction_patterns(user_id);
CREATE INDEX idx_transaction_patterns_normalized ON transaction_patterns(normalized_pattern);
CREATE INDEX idx_transaction_patterns_confidence ON transaction_patterns(confidence_score DESC);

-- RLS
ALTER TABLE transaction_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns"
  ON transaction_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON transaction_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON transaction_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON transaction_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- Função para normalizar descrição (remove números, lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_description(description TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(description, '[0-9]', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para buscar padrão similar
CREATE OR REPLACE FUNCTION find_similar_pattern(
  p_user_id UUID,
  p_description TEXT
)
RETURNS TABLE (
  pattern_id UUID,
  transaction_type TEXT,
  category_id UUID,
  confidence_score INTEGER,
  similarity REAL
) AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := normalize_description(p_description);

  RETURN QUERY
  SELECT
    tp.id,
    tp.transaction_type,
    tp.category_id,
    tp.confidence_score,
    similarity(tp.normalized_pattern, normalized) as sim
  FROM transaction_patterns tp
  WHERE tp.user_id = p_user_id
    AND similarity(tp.normalized_pattern, normalized) > 0.5
  ORDER BY
    similarity(tp.normalized_pattern, normalized) DESC,
    tp.confidence_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Extensão para similaridade de texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca rápida por similaridade
CREATE INDEX idx_transaction_patterns_trgm ON transaction_patterns
  USING gin(normalized_pattern gin_trgm_ops);

COMMENT ON TABLE transaction_patterns IS 'Padrões aprendidos de transações para auto-classificação';
COMMENT ON COLUMN transaction_patterns.description_pattern IS 'Descrição original da transação';
COMMENT ON COLUMN transaction_patterns.normalized_pattern IS 'Descrição normalizada (sem números, lowercase) para matching';
COMMENT ON COLUMN transaction_patterns.confidence_score IS 'Quantidade de vezes que este padrão foi usado - quanto maior, mais confiável';
