-- Tabela para armazenar configuração de layout do dashboard
CREATE TABLE IF NOT EXISTS dashboard_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, widget_id)
);

-- Index para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_dashboard_layout_user_id ON dashboard_layout(user_id);

-- RLS Policies
ALTER TABLE dashboard_layout ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas seu próprio layout
CREATE POLICY "Users can view own dashboard layout"
  ON dashboard_layout
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir seu próprio layout
CREATE POLICY "Users can insert own dashboard layout"
  ON dashboard_layout
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar seu próprio layout
CREATE POLICY "Users can update own dashboard layout"
  ON dashboard_layout
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem deletar seu próprio layout
CREATE POLICY "Users can delete own dashboard layout"
  ON dashboard_layout
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_dashboard_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_layout_updated_at
  BEFORE UPDATE ON dashboard_layout
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_layout_updated_at();
