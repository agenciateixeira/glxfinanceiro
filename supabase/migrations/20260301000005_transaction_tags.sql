-- Sistema de Tags para Transações
-- Permite organizar e filtrar transações por múltiplas tags

-- Tabela de Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280', -- Cor da tag
  icon TEXT DEFAULT 'Tag', -- Ícone Lucide

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unicidade por usuário
  UNIQUE(user_id, name)
);

-- Tabela de relacionamento Transação <-> Tags (muitos para muitos)
CREATE TABLE IF NOT EXISTS transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Evita duplicação
  UNIQUE(transaction_id, tag_id)
);

-- Índices para performance
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);

-- RLS para Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- RLS para TransactionTags
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction_tags"
  ON transaction_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction_tags"
  ON transaction_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction_tags"
  ON transaction_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- Função para buscar transações com tags
CREATE OR REPLACE FUNCTION get_transactions_with_tags(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  date DATE,
  description TEXT,
  amount NUMERIC,
  type TEXT,
  category_id UUID,
  payment_method TEXT,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.description,
    t.amount,
    t.type,
    t.category_id,
    t.payment_method,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', tg.id,
          'name', tg.name,
          'color', tg.color,
          'icon', tg.icon
        )
        ORDER BY tg.name
      ) FILTER (WHERE tg.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM transactions t
  LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
  LEFT JOIN tags tg ON tg.id = tt.tag_id
  WHERE t.user_id = p_user_id
  GROUP BY t.id, t.date, t.description, t.amount, t.type, t.category_id, t.payment_method
  ORDER BY t.date DESC, t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tags comuns pré-definidas (opcionais)
COMMENT ON TABLE tags IS 'Tags para organizar e filtrar transações';
COMMENT ON TABLE transaction_tags IS 'Relacionamento muitos-para-muitos entre transações e tags';

-- Exemplos de uso:
--
-- Criar tag:
-- INSERT INTO tags (user_id, name, color, icon)
-- VALUES ('user-uuid', 'Viagem', '#3b82f6', 'Plane');
--
-- Adicionar tag em transação:
-- INSERT INTO transaction_tags (transaction_id, tag_id)
-- VALUES ('transaction-uuid', 'tag-uuid');
--
-- Buscar transações com tags:
-- SELECT * FROM get_transactions_with_tags('user-uuid', 50, 0);
