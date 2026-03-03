-- ============================================
-- SISTEMA DE HOUSEHOLDS (FAMÍLIAS/GRUPOS)
-- Multi-tenancy correto com isolamento de dados
-- ============================================

-- ============================================
-- 1. TABELA DE HOUSEHOLDS
-- ============================================

CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Informações básicas
  family_name TEXT NOT NULL, -- "Família Silva", "João Santos", etc
  household_type TEXT NOT NULL CHECK (household_type IN ('individual', 'couple', 'family')),

  -- Owner (primeiro usuário que criou)
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,

  -- Metas (da anamnese)
  primary_goal TEXT, -- Meta principal definida no onboarding
  goal_description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_households_owner_id ON households(owner_id);
CREATE INDEX IF NOT EXISTS idx_households_is_active ON households(is_active);
CREATE INDEX IF NOT EXISTS idx_households_type ON households(household_type);

-- ============================================
-- 2. ADICIONAR HOUSEHOLD_ID EM USERS
-- ============================================

-- Adicionar coluna household_id na tabela users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE users ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;
    CREATE INDEX idx_users_household_id ON users(household_id);
  END IF;
END $$;

-- Adicionar informações de membro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_in_household'
  ) THEN
    ALTER TABLE users ADD COLUMN role_in_household TEXT CHECK (role_in_household IN ('owner', 'spouse', 'member'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;
END $$;

-- ============================================
-- 3. TABELA DE MEMBROS DO HOUSEHOLD
-- ============================================

CREATE TABLE IF NOT EXISTS household_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informações do membro
  role TEXT NOT NULL CHECK (role IN ('owner', 'spouse', 'child', 'member')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Status
  invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,

  -- Permissões
  can_manage_members BOOLEAN DEFAULT false,
  can_manage_finances BOOLEAN DEFAULT true,
  can_view_only BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: usuário só pode estar em um household
  CONSTRAINT unique_user_per_household UNIQUE (user_id, household_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_status ON household_members(invitation_status);

-- ============================================
-- 4. DADOS DO ONBOARDING
-- ============================================

CREATE TABLE IF NOT EXISTS onboarding_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- Etapas completadas
  step_basic_info BOOLEAN DEFAULT false,
  step_household_type BOOLEAN DEFAULT false,
  step_members BOOLEAN DEFAULT false,
  step_goals BOOLEAN DEFAULT false,
  step_completed BOOLEAN DEFAULT false,

  -- Dados coletados
  data JSONB, -- Armazena todos os dados do formulário

  -- Timestamp de cada etapa
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_onboarding_per_household UNIQUE (household_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_household_id ON onboarding_data(household_id);

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_households_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_households_updated_at ON households;
CREATE TRIGGER trigger_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_households_updated_at();

DROP TRIGGER IF EXISTS trigger_household_members_updated_at ON household_members;
CREATE TRIGGER trigger_household_members_updated_at
  BEFORE UPDATE ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION update_households_updated_at();

DROP TRIGGER IF EXISTS trigger_onboarding_updated_at ON onboarding_data;
CREATE TRIGGER trigger_onboarding_updated_at
  BEFORE UPDATE ON onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION update_households_updated_at();

-- ============================================
-- 6. RLS POLICIES - HOUSEHOLDS
-- ============================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_data ENABLE ROW LEVEL SECURITY;

-- Policies para households
DROP POLICY IF EXISTS "Users can view their household" ON households;
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their household" ON households;
CREATE POLICY "Users can update their household"
  ON households FOR UPDATE
  USING (
    id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert households" ON households;
CREATE POLICY "Users can insert households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies para household_members
DROP POLICY IF EXISTS "Users can view their household members" ON household_members;
CREATE POLICY "Users can view their household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert household members" ON household_members;
CREATE POLICY "Users can insert household members"
  ON household_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update household members" ON household_members;
CREATE POLICY "Users can update household members"
  ON household_members FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

-- Policies para onboarding_data
DROP POLICY IF EXISTS "Users can view their onboarding data" ON onboarding_data;
CREATE POLICY "Users can view their onboarding data"
  ON onboarding_data FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their onboarding data" ON onboarding_data;
CREATE POLICY "Users can manage their onboarding data"
  ON onboarding_data FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================
-- 7. FUNÇÃO HELPER PARA VERIFICAR HOUSEHOLD
-- ============================================

CREATE OR REPLACE FUNCTION get_user_household_id(p_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN (
    SELECT household_id
    FROM users
    WHERE id = v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO PARA CRIAR HOUSEHOLD NO SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION create_household_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Criar household automaticamente para novo usuário (se ainda não tem)
  IF NEW.household_id IS NULL THEN
    INSERT INTO households (
      family_name,
      household_type,
      owner_id,
      onboarding_completed
    ) VALUES (
      COALESCE(NEW.full_name, NEW.email),
      'individual', -- padrão individual, será atualizado no onboarding
      NEW.id,
      false
    )
    RETURNING id INTO new_household_id;

    -- Atualizar user com household_id
    NEW.household_id := new_household_id;
    NEW.role_in_household := 'owner';

    -- Criar registro de membro
    INSERT INTO household_members (
      household_id,
      user_id,
      role,
      name,
      email,
      invitation_status,
      joined_at,
      can_manage_members,
      can_manage_finances
    ) VALUES (
      new_household_id,
      NEW.id,
      'owner',
      COALESCE(NEW.full_name, NEW.email),
      NEW.email,
      'accepted',
      NOW(),
      true,
      true
    );

    -- Criar registro de onboarding
    INSERT INTO onboarding_data (household_id) VALUES (new_household_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger no users (se a tabela users permitir triggers)
DROP TRIGGER IF EXISTS trigger_create_household_on_signup ON users;
CREATE TRIGGER trigger_create_household_on_signup
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_household_on_signup();
