# ARQUITETURA DO BANCO DE DADOS - GESTÃO PESSOAL GLX

## 1. VISÃO GERAL

Sistema de gestão financeira para casais com:
- Autenticação multi-usuário (casal)
- Importação automática de faturas e extratos
- Categorização inteligente de despesas
- Divisão configurável de gastos (individual vs compartilhado)
- Metas financeiras conjuntas

---

## 2. DIAGRAMA DE ENTIDADES (ER)

```
┌─────────────────┐
│     users       │ (Supabase Auth - gerenciado automaticamente)
└────────┬────────┘
         │
         │ 1:N
         │
┌────────┴────────────────┐
│      couples            │  (Relacionamento entre usuários)
│─────────────────────────│
│ id (PK)                 │
│ user_1_id (FK)          │
│ user_2_id (FK)          │
│ split_mode              │  (50/50, proporcional, customizado)
│ user_1_split_percentage │
│ user_2_split_percentage │
│ created_at              │
└────────┬────────────────┘
         │
         │ 1:N
         │
┌────────┴────────────────┐        ┌──────────────────────┐
│     accounts            │        │     categories       │
│─────────────────────────│        │──────────────────────│
│ id (PK)                 │        │ id (PK)              │
│ couple_id (FK)          │        │ name                 │
│ type                    │        │ icon                 │
│ name                    │        │ color                │
│ bank_name               │        │ type                 │ (expense/income)
│ balance                 │        │ parent_category_id   │ (FK - self)
│ owner                   │        │ is_system            │ (categorias padrão vs customizadas)
│ created_at              │        │ created_at           │
└────────┬────────────────┘        └──────────┬───────────┘
         │                                    │
         │ 1:N                                │
         │                                    │ N:1
         │                          ┌─────────┴────────────────┐
         │                          │                          │
         └──────────────────────────┤     transactions         │
                                    │──────────────────────────│
                                    │ id (PK)                  │
                                    │ couple_id (FK)           │
                                    │ account_id (FK)          │
                                    │ category_id (FK)         │
                                    │ description              │
                                    │ amount                   │
                                    │ type                     │ (expense/income)
                                    │ date                     │
                                    │ is_shared                │ (despesa compartilhada?)
                                    │ paid_by                  │ (FK users - quem pagou)
                                    │ split_type               │ (equal, custom, percentage)
                                    │ user_1_amount            │
                                    │ user_2_amount            │
                                    │ status                   │ (pending, completed, cancelled)
                                    │ source                   │ (manual, imported, recurring)
                                    │ imported_from_id (FK)    │
                                    │ notes                    │
                                    │ created_at               │
                                    │ updated_at               │
                                    └──────────┬───────────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        │                      │                      │
                        │ 1:N                  │ 1:N                  │ 1:N
                        │                      │                      │
            ┌───────────┴──────────┐  ┌────────┴──────────┐  ┌────────┴──────────┐
            │  imported_files      │  │  recurring_txn    │  │  transaction_tags │
            │──────────────────────│  │───────────────────│  │───────────────────│
            │ id (PK)              │  │ id (PK)           │  │ id (PK)           │
            │ couple_id (FK)       │  │ couple_id (FK)    │  │ transaction_id FK │
            │ file_name            │  │ template_txn_id FK│  │ tag_id (FK)       │
            │ file_type            │  │ frequency         │  │ created_at        │
            │ file_url             │  │ next_date         │  └───────────────────┘
            │ status               │  │ is_active         │            │
            │ uploaded_by (FK)     │  │ end_date          │            │ N:1
            │ processed_at         │  │ created_at        │            │
            │ total_transactions   │  └───────────────────┘  ┌─────────┴─────────┐
            │ created_at           │                         │      tags         │
            └──────────────────────┘                         │───────────────────│
                                                             │ id (PK)           │
┌──────────────────────┐                                    │ couple_id (FK)    │
│    budget_goals      │                                    │ name              │
│──────────────────────│                                    │ color             │
│ id (PK)              │                                    │ created_at        │
│ couple_id (FK)       │                                    └───────────────────┘
│ category_id (FK)     │
│ amount_limit         │
│ period               │  (monthly, weekly, yearly)
│ start_date           │
│ end_date             │
│ alert_threshold      │  (% para alertar)
│ is_active            │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│   savings_goals      │
│──────────────────────│
│ id (PK)              │
│ couple_id (FK)       │
│ name                 │
│ description          │
│ target_amount        │
│ current_amount       │
│ target_date          │
│ priority             │
│ status               │  (active, completed, cancelled)
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

---

## 3. DEFINIÇÃO DAS TABELAS

### 3.1 COUPLES (Relacionamento do Casal)

```sql
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_mode VARCHAR(20) DEFAULT 'equal' CHECK (split_mode IN ('equal', 'proportional', 'custom')),
  user_1_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  user_2_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT different_users CHECK (user_1_id != user_2_id),
  CONSTRAINT valid_split CHECK (user_1_split_percentage + user_2_split_percentage = 100)
);

-- Índices
CREATE INDEX idx_couples_user_1 ON couples(user_1_id);
CREATE INDEX idx_couples_user_2 ON couples(user_2_id);
```

**Campos**:
- `split_mode`: Como dividir despesas compartilhadas
  - `equal`: 50/50
  - `proportional`: Baseado em renda (configurado manualmente)
  - `custom`: Percentuais customizados
- `user_X_split_percentage`: % padrão de divisão

---

### 3.2 ACCOUNTS (Contas Bancárias/Cartões)

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'investment', 'cash')),
  name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100),
  balance DECIMAL(12,2) DEFAULT 0.00,
  owner VARCHAR(20) CHECK (owner IN ('user_1', 'user_2', 'shared')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_accounts_couple ON accounts(couple_id);
CREATE INDEX idx_accounts_type ON accounts(type);
```

**Tipos de Conta**:
- `checking`: Conta corrente
- `savings`: Conta poupança
- `credit_card`: Cartão de crédito
- `investment`: Investimentos
- `cash`: Dinheiro em espécie

---

### 3.3 CATEGORIES (Categorias de Transação)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
```

**Categorias Padrão do Sistema** (is_system = true):

**Despesas**:
- Moradia (Aluguel, Condomínio, IPTU, Manutenção)
- Alimentação (Mercado, Restaurantes, Delivery)
- Transporte (Combustível, Transporte público, Uber, Manutenção veículo)
- Saúde (Plano de saúde, Farmácia, Consultas)
- Educação (Cursos, Livros, Material)
- Lazer (Viagens, Cinema, Streaming, Hobbies)
- Vestuário (Roupas, Calçados, Acessórios)
- Contas (Luz, Água, Internet, Celular)
- Pets (Ração, Veterinário, Acessórios)
- Outros

**Receitas**:
- Salário
- Freelance
- Investimentos
- Outros

---

### 3.4 TRANSACTIONS (Transações Financeiras)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  date DATE NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage', 'none')),
  user_1_amount DECIMAL(12,2),
  user_2_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'imported', 'recurring')),
  imported_from_id UUID REFERENCES imported_files(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_split_amounts CHECK (
    (is_shared = false) OR
    (user_1_amount + user_2_amount = amount)
  )
);

-- Índices importantes para performance
CREATE INDEX idx_transactions_couple ON transactions(couple_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_source ON transactions(source);

-- Índice composto para queries comuns
CREATE INDEX idx_transactions_couple_date ON transactions(couple_id, date DESC);
```

**Lógica de Divisão**:
- Se `is_shared = false`: Despesa individual
- Se `is_shared = true`: Dividir conforme `split_type`
  - `equal`: 50/50
  - `percentage`: Usar percentuais do casal
  - `custom`: Valores customizados em user_1_amount e user_2_amount
  - `none`: Apenas um paga (não divide)

---

### 3.5 IMPORTED_FILES (Arquivos Importados)

```sql
CREATE TABLE imported_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('credit_card_invoice', 'bank_statement', 'csv', 'ofx')),
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  total_transactions INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_imported_files_couple ON imported_files(couple_id);
CREATE INDEX idx_imported_files_status ON imported_files(status);
CREATE INDEX idx_imported_files_date ON imported_files(created_at DESC);
```

**Fluxo de Importação**:
1. Upload do arquivo → Salva no Supabase Storage
2. Status `processing` → OCR + Parsing
3. Extrai transações → Cria registros em `transactions` com `source='imported'`
4. Status `completed` → Usuário pode revisar e editar

---

### 3.6 RECURRING_TRANSACTIONS (Transações Recorrentes)

```sql
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  template_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_recurring_couple ON recurring_transactions(couple_id);
CREATE INDEX idx_recurring_next_date ON recurring_transactions(next_date);
CREATE INDEX idx_recurring_active ON recurring_transactions(is_active);
```

**Exemplos de Uso**:
- Aluguel (monthly)
- Salário (monthly)
- Academia (monthly)
- Assinaturas (monthly/yearly)

**Lógica**:
- Cron job diário verifica `next_date`
- Se `next_date <= hoje` AND `is_active = true`
  - Cria nova transação baseada no template
  - Atualiza `next_date` baseado em `frequency`

---

### 3.7 TAGS (Etiquetas para Transações)

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(couple_id, name)
);

CREATE TABLE transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(transaction_id, tag_id)
);

-- Índices
CREATE INDEX idx_tags_couple ON tags(couple_id);
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);
```

**Uso**:
- Permite organização adicional além de categorias
- Exemplos: "Viagem Europa", "Reforma Casa", "Casamento", "Emergência"

---

### 3.8 BUDGET_GOALS (Metas de Orçamento)

```sql
CREATE TABLE budget_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount_limit DECIMAL(12,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold DECIMAL(5,2) DEFAULT 80.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_threshold CHECK (alert_threshold > 0 AND alert_threshold <= 100)
);

-- Índices
CREATE INDEX idx_budget_goals_couple ON budget_goals(couple_id);
CREATE INDEX idx_budget_goals_category ON budget_goals(category_id);
CREATE INDEX idx_budget_goals_active ON budget_goals(is_active);
```

**Funcionalidade**:
- Define limite de gastos por categoria
- Alerta quando atingir `alert_threshold`% do limite
- Exemplo: "Restaurantes: R$ 800/mês, alertar aos 80% (R$ 640)"

---

### 3.9 SAVINGS_GOALS (Metas de Economia)

```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0.00,
  target_date DATE,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_amounts CHECK (current_amount >= 0 AND current_amount <= target_amount)
);

-- Índices
CREATE INDEX idx_savings_goals_couple ON savings_goals(couple_id);
CREATE INDEX idx_savings_goals_status ON savings_goals(status);
```

**Exemplos**:
- "Fundo de Emergência: R$ 20.000"
- "Viagem para Europa: R$ 15.000"
- "Entrada do Apartamento: R$ 100.000"

---

## 4. ROW LEVEL SECURITY (RLS) - CRUCIAL

### 4.1 Política Geral: Cada casal vê apenas seus dados

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- COUPLES: Usuário pode ver apenas casais dos quais faz parte
CREATE POLICY "Users can view their own couples"
  ON couples FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can insert couples they're part of"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can update their own couples"
  ON couples FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- ACCOUNTS: Usuário vê contas do seu casal
CREATE POLICY "Users can view couple accounts"
  ON accounts FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user_1_id = auth.uid() OR user_2_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage couple accounts"
  ON accounts FOR ALL
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user_1_id = auth.uid() OR user_2_id = auth.uid()
    )
  );

-- TRANSACTIONS: Usuário vê transações do seu casal
CREATE POLICY "Users can view couple transactions"
  ON transactions FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user_1_id = auth.uid() OR user_2_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage couple transactions"
  ON transactions FOR ALL
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user_1_id = auth.uid() OR user_2_id = auth.uid()
    )
  );

-- Replicar políticas similares para todas as outras tabelas
```

### 4.2 Categories: Acesso público às categorias do sistema

```sql
-- Categories são públicas (sistema) ou privadas (customizadas por casal)
CREATE POLICY "Anyone can view system categories"
  ON categories FOR SELECT
  USING (is_system = true);

-- Apenas visualização - categorias do sistema não podem ser editadas
CREATE POLICY "Users can manage custom categories"
  ON categories FOR ALL
  USING (is_system = false);
```

---

## 5. TRIGGERS E FUNCTIONS

### 5.1 Atualizar updated_at automaticamente

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 5.2 Atualizar saldo da conta automaticamente

```sql
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverte transação antiga
    IF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
    -- Aplica nova transação
    IF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();
```

---

### 5.3 Calcular divisão automática de despesas compartilhadas

```sql
CREATE OR REPLACE FUNCTION calculate_split_amounts()
RETURNS TRIGGER AS $$
DECLARE
  couple_record RECORD;
BEGIN
  IF NEW.is_shared = true THEN
    SELECT * INTO couple_record FROM couples WHERE id = NEW.couple_id;

    IF NEW.split_type = 'equal' THEN
      NEW.user_1_amount := NEW.amount / 2;
      NEW.user_2_amount := NEW.amount / 2;
    ELSIF NEW.split_type = 'percentage' THEN
      NEW.user_1_amount := NEW.amount * (couple_record.user_1_split_percentage / 100);
      NEW.user_2_amount := NEW.amount * (couple_record.user_2_split_percentage / 100);
    END IF;
  ELSE
    NEW.user_1_amount := NULL;
    NEW.user_2_amount := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_split
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_split_amounts();
```

---

## 6. VIEWS ÚTEIS

### 6.1 Dashboard Principal - Resumo Mensal

```sql
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  t.couple_id,
  DATE_TRUNC('month', t.date) as month,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_balance
FROM transactions t
WHERE t.status = 'completed'
GROUP BY t.couple_id, DATE_TRUNC('month', t.date);
```

---

### 6.2 Gastos por Categoria (Mensal)

```sql
CREATE OR REPLACE VIEW v_expenses_by_category AS
SELECT
  t.couple_id,
  DATE_TRUNC('month', t.date) as month,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  SUM(t.amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense' AND t.status = 'completed'
GROUP BY t.couple_id, DATE_TRUNC('month', t.date), c.id, c.name, c.icon, c.color;
```

---

### 6.3 Progresso de Metas de Orçamento

```sql
CREATE OR REPLACE VIEW v_budget_progress AS
SELECT
  bg.id,
  bg.couple_id,
  bg.name,
  bg.amount_limit,
  bg.period,
  bg.alert_threshold,
  c.name as category_name,
  COALESCE(SUM(t.amount), 0) as current_spent,
  bg.amount_limit - COALESCE(SUM(t.amount), 0) as remaining,
  (COALESCE(SUM(t.amount), 0) / bg.amount_limit * 100) as percentage_used
FROM budget_goals bg
LEFT JOIN categories c ON bg.category_id = c.id
LEFT JOIN transactions t ON t.category_id = bg.category_id
  AND t.couple_id = bg.couple_id
  AND t.type = 'expense'
  AND t.status = 'completed'
  AND (
    (bg.period = 'monthly' AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)) OR
    (bg.period = 'weekly' AND DATE_TRUNC('week', t.date) = DATE_TRUNC('week', CURRENT_DATE)) OR
    (bg.period = 'yearly' AND DATE_TRUNC('year', t.date) = DATE_TRUNC('year', CURRENT_DATE))
  )
WHERE bg.is_active = true
GROUP BY bg.id, bg.couple_id, bg.name, bg.amount_limit, bg.period, bg.alert_threshold, c.name;
```

---

## 7. ÍNDICES DE PERFORMANCE

Já incluídos nas definições acima, mas resumindo os mais críticos:

```sql
-- Transactions (tabela mais acessada)
CREATE INDEX idx_transactions_couple_date ON transactions(couple_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- Contas
CREATE INDEX idx_accounts_couple ON accounts(couple_id);

-- Arquivos importados
CREATE INDEX idx_imported_files_couple_date ON imported_files(couple_id, created_at DESC);

-- Budget Goals
CREATE INDEX idx_budget_goals_couple_active ON budget_goals(couple_id, is_active);
```

---

## 8. SEED DATA - Categorias do Sistema

```sql
-- Categorias de Despesas
INSERT INTO categories (name, icon, color, type, is_system) VALUES
('Moradia', '🏠', '#FF6B6B', 'expense', true),
('Alimentação', '🍔', '#4ECDC4', 'expense', true),
('Transporte', '🚗', '#45B7D1', 'expense', true),
('Saúde', '⚕️', '#96CEB4', 'expense', true),
('Educação', '📚', '#FFEAA7', 'expense', true),
('Lazer', '🎉', '#DFE6E9', 'expense', true),
('Vestuário', '👔', '#FD79A8', 'expense', true),
('Contas', '💡', '#FDCB6E', 'expense', true),
('Pets', '🐾', '#A29BFE', 'expense', true),
('Outros', '📦', '#B2BEC3', 'expense', true);

-- Categorias de Receitas
INSERT INTO categories (name, icon, color, type, is_system) VALUES
('Salário', '💰', '#00B894', 'income', true),
('Freelance', '💻', '#00CEC9', 'income', true),
('Investimentos', '📈', '#74B9FF', 'income', true),
('Outros', '💵', '#55EFC4', 'income', true);

-- Subcategorias (exemplos)
INSERT INTO categories (name, icon, color, type, parent_category_id, is_system)
SELECT 'Aluguel', '🔑', '#FF6B6B', 'expense', id, true FROM categories WHERE name = 'Moradia' LIMIT 1;

INSERT INTO categories (name, icon, color, type, parent_category_id, is_system)
SELECT 'Mercado', '🛒', '#4ECDC4', 'expense', id, true FROM categories WHERE name = 'Alimentação' LIMIT 1;

INSERT INTO categories (name, icon, color, type, parent_category_id, is_system)
SELECT 'Restaurantes', '🍽️', '#4ECDC4', 'expense', id, true FROM categories WHERE name = 'Alimentação' LIMIT 1;
```

---

## 9. MIGRAÇÕES - ORDEM DE EXECUÇÃO

```bash
# 1. Criar tabelas base
supabase migration create create_couples_table
supabase migration create create_categories_table
supabase migration create create_accounts_table
supabase migration create create_transactions_table

# 2. Criar tabelas secundárias
supabase migration create create_imported_files_table
supabase migration create create_recurring_transactions_table
supabase migration create create_tags_tables
supabase migration create create_goals_tables

# 3. Adicionar RLS
supabase migration create add_rls_policies

# 4. Criar triggers e functions
supabase migration create create_triggers_and_functions

# 5. Criar views
supabase migration create create_useful_views

# 6. Seed data
supabase migration create seed_system_categories
```

---

## 10. PRÓXIMOS PASSOS

1. **Revisar arquitetura** - Validar se atende todos os casos de uso
2. **Criar migrations** - Implementar schema no Supabase
3. **Testar RLS** - Garantir segurança dos dados
4. **Criar API helpers** - Functions JavaScript para operações comuns
5. **Prototipar UI** - Telas principais do sistema

---

## 11. CONSIDERAÇÕES FINAIS

### 11.1 Escalabilidade
- Índices otimizados para queries mais comuns
- Views materializadas podem ser criadas se performance degradar
- Particionamento de tabela `transactions` por data se volume crescer muito

### 11.2 Backup e Auditoria
- Considerar criar tabela `audit_log` para rastrear mudanças críticas
- Supabase faz backup automático, mas importante ter estratégia de restore

### 11.3 Performance
- Monitor queries lentas com `pg_stat_statements`
- Considerar caching de queries frequentes no frontend
- Realtime subscriptions apenas para dados críticos (evitar overhead)

---

**Status**: Arquitetura Proposta - Aguardando Aprovação
**Próxima Ação**: Revisar com o usuário antes de implementar
