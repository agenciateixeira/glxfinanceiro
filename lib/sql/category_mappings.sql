-- Tabela para armazenar mapeamentos de palavras-chave para categorias
-- Isso permite que o sistema aprenda com as categorizações do usuário

CREATE TABLE IF NOT EXISTS category_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence_score INTEGER DEFAULT 1, -- Incrementa cada vez que o usuário confirma esse mapeamento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, keyword, category_id)
);

-- Index para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_category_mappings_user_id ON category_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_category_mappings_keyword ON category_mappings(keyword);

-- RLS Policies
ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own category mappings"
  ON category_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category mappings"
  ON category_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category mappings"
  ON category_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category mappings"
  ON category_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela para armazenar transações importadas temporariamente (antes da confirmação)
CREATE TABLE IF NOT EXISTS imported_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_session_id UUID NOT NULL, -- Agrupa transações da mesma importação
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3, 2), -- 0.0 a 1.0
  matched_keywords TEXT[], -- Array de palavras-chave que deram match
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_imported_transactions_user_id ON imported_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_transactions_session_id ON imported_transactions(import_session_id);

ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imported transactions"
  ON imported_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imported transactions"
  ON imported_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imported transactions"
  ON imported_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imported transactions"
  ON imported_transactions FOR DELETE
  USING (auth.uid() = user_id);
