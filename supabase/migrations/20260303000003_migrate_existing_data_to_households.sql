-- ============================================
-- MIGRAÇÃO DE DADOS EXISTENTES PARA HOUSEHOLDS
-- ============================================

-- ============================================
-- 1. CRIAR HOUSEHOLD PARA CADA USUÁRIO EXISTENTE (SE NÃO TEM)
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
BEGIN
  -- Para cada usuário que não tem household
  FOR user_record IN
    SELECT u.id, u.full_name, au.email
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.household_id IS NULL
  LOOP
    -- Criar household para este usuário
    INSERT INTO households (
      family_name,
      household_type,
      owner_id,
      onboarding_completed
    ) VALUES (
      COALESCE(user_record.full_name, user_record.email, 'Usuário'),
      'individual',
      user_record.id,
      true -- Marcar como completo para não mostrar onboarding
    )
    RETURNING id INTO new_household_id;

    -- Atualizar usuário com o household_id
    UPDATE users
    SET
      household_id = new_household_id,
      role_in_household = 'owner'
    WHERE id = user_record.id;

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
      user_record.id,
      'owner',
      COALESCE(user_record.full_name, user_record.email, 'Usuário'),
      user_record.email,
      'accepted',
      NOW(),
      true,
      true
    );

    -- Criar registro de onboarding
    INSERT INTO onboarding_data (
      household_id,
      step_completed,
      completed_at
    ) VALUES (
      new_household_id,
      true,
      NOW()
    )
    ON CONFLICT (household_id) DO NOTHING;

    RAISE NOTICE 'Household criado para usuário: % (ID: %)', user_record.email, user_record.id;
  END LOOP;
END $$;

-- ============================================
-- 2. ATUALIZAR HOUSEHOLD_ID EM TODAS AS TABELAS BASEADO NO USER_ID
-- ============================================

-- Função para migrar household_id baseado no user_id
CREATE OR REPLACE FUNCTION migrate_household_id_for_table(table_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  EXECUTE format('
    UPDATE %I t
    SET household_id = u.household_id
    FROM users u
    WHERE t.user_id = u.id
      AND t.household_id IS NULL
      AND u.household_id IS NOT NULL
  ', table_name);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RAISE NOTICE 'Tabela %: % linhas atualizadas', table_name, rows_updated;

  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Executar para todas as tabelas
SELECT migrate_household_id_for_table('categories');
SELECT migrate_household_id_for_table('transactions');
SELECT migrate_household_id_for_table('bank_accounts');
SELECT migrate_household_id_for_table('account_transfers');
SELECT migrate_household_id_for_table('recurring_expenses');
SELECT migrate_household_id_for_table('financial_settings');
SELECT migrate_household_id_for_table('credit_cards');
SELECT migrate_household_id_for_table('credit_card_invoices');
SELECT migrate_household_id_for_table('credit_card_transactions');
SELECT migrate_household_id_for_table('investments');
SELECT migrate_household_id_for_table('investment_history');
SELECT migrate_household_id_for_table('emergency_reserve_goals');
SELECT migrate_household_id_for_table('bank_statement_items');
SELECT migrate_household_id_for_table('reconciliation_rules');
SELECT migrate_household_id_for_table('reconciliation_log');
SELECT migrate_household_id_for_table('statement_imports');

-- ============================================
-- 3. LIMPAR SHARED_ACCOUNTS (MIGRAR PARA HOUSEHOLD)
-- ============================================

-- Migrar relacionamentos de shared_accounts para household_members
DO $$
DECLARE
  share_record RECORD;
  user1_household UUID;
  user2_household UUID;
BEGIN
  -- Para cada relacionamento em shared_accounts
  FOR share_record IN
    SELECT * FROM shared_accounts
  LOOP
    -- Pegar household_id de cada usuário
    SELECT household_id INTO user1_household
    FROM users WHERE id = share_record.user1_id;

    SELECT household_id INTO user2_household
    FROM users WHERE id = share_record.user2_id;

    -- Se ambos têm household diferentes, precisamos decidir qual usar
    -- Por padrão, vamos manter o household do user1 e mover o user2 para lá
    IF user1_household IS NOT NULL AND user2_household IS NOT NULL AND user1_household != user2_household THEN

      -- Atualizar user2 para o household do user1
      UPDATE users
      SET
        household_id = user1_household,
        role_in_household = 'spouse'
      WHERE id = share_record.user2_id;

      -- Atualizar household para tipo 'couple'
      UPDATE households
      SET household_type = 'couple'
      WHERE id = user1_household;

      -- Criar/Atualizar membro no household
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
      )
      SELECT
        user1_household,
        share_record.user2_id,
        'spouse',
        COALESCE(u.full_name, au.email),
        au.email,
        'accepted',
        NOW(),
        true,
        true
      FROM users u
      LEFT JOIN auth.users au ON u.id = au.id
      WHERE u.id = share_record.user2_id
      ON CONFLICT (user_id, household_id) DO UPDATE
      SET invitation_status = 'accepted',
          joined_at = NOW();

      -- Migrar TODOS os dados do user2 para o household do user1
      UPDATE categories SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE transactions SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE bank_accounts SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE account_transfers SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE recurring_expenses SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE financial_settings SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE credit_cards SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE credit_card_invoices SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE credit_card_transactions SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE investments SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE investment_history SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE emergency_reserve_goals SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE bank_statement_items SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE reconciliation_rules SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE reconciliation_log SET household_id = user1_household WHERE user_id = share_record.user2_id;
      UPDATE statement_imports SET household_id = user1_household WHERE user_id = share_record.user2_id;

      -- Deletar household antigo do user2 (se existir e estiver vazio)
      DELETE FROM households
      WHERE id = user2_household
        AND id != user1_household
        AND NOT EXISTS (
          SELECT 1 FROM users WHERE household_id = user2_household
        );

      RAISE NOTICE 'Migrado compartilhamento: % e % para household %',
        share_record.user1_id, share_record.user2_id, user1_household;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 4. VALIDAÇÃO FINAL
-- ============================================

-- Verificar se ainda há dados sem household_id
DO $$
DECLARE
  table_name TEXT;
  orphan_count INTEGER;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'categories', 'transactions', 'bank_accounts', 'account_transfers',
      'recurring_expenses', 'financial_settings', 'credit_cards',
      'credit_card_invoices', 'credit_card_transactions', 'investments',
      'investment_history', 'emergency_reserve_goals', 'bank_statement_items',
      'reconciliation_rules', 'reconciliation_log', 'statement_imports'
    ])
  LOOP
    EXECUTE format('
      SELECT COUNT(*)
      FROM %I
      WHERE household_id IS NULL
    ', table_name) INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE WARNING 'ATENÇÃO: Tabela % tem % registros sem household_id', table_name, orphan_count;
    ELSE
      RAISE NOTICE 'OK: Tabela % - todos os registros têm household_id', table_name;
    END IF;
  END LOOP;
END $$;

-- Verificar usuários sem household
DO $$
DECLARE
  orphan_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_users
  FROM users
  WHERE household_id IS NULL;

  IF orphan_users > 0 THEN
    RAISE WARNING 'ATENÇÃO: % usuários sem household_id', orphan_users;
  ELSE
    RAISE NOTICE 'OK: Todos os usuários têm household_id';
  END IF;
END $$;

-- Mostrar resumo de households criados
SELECT
  h.id,
  h.family_name,
  h.household_type,
  COUNT(DISTINCT hm.user_id) as members_count,
  array_agg(DISTINCT au.email) as members_emails
FROM households h
LEFT JOIN household_members hm ON h.id = hm.household_id
LEFT JOIN users u ON hm.user_id = u.id
LEFT JOIN auth.users au ON u.id = au.id
GROUP BY h.id, h.family_name, h.household_type
ORDER BY h.created_at;
