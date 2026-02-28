-- =====================================================
-- 99 - CORRIGIR USUÁRIOS ÓRFÃOS
-- =====================================================
-- Descrição: Migra usuários que existem no auth.users mas não em public.users
-- Use: Execute este script se você criou usuários antes de configurar o banco
-- =====================================================

-- Inserir usuários órfãos na tabela public.users
INSERT INTO public.users (id, full_name, phone, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.raw_user_meta_data->>'phone' as phone,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Criar preferências para usuários órfãos
INSERT INTO public.user_preferences (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN public.user_preferences up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Mostrar resultado
DO $$
DECLARE
  users_migrated INTEGER;
  prefs_created INTEGER;
BEGIN
  -- Contar usuários migrados
  SELECT COUNT(*) INTO users_migrated
  FROM auth.users au
  INNER JOIN public.users pu ON au.id = pu.id;

  -- Contar preferências criadas
  SELECT COUNT(*) INTO prefs_created
  FROM public.user_preferences;

  RAISE NOTICE '✅ Migração concluída!';
  RAISE NOTICE 'Total de usuários na tabela users: %', users_migrated;
  RAISE NOTICE 'Total de preferências criadas: %', prefs_created;
END $$;
