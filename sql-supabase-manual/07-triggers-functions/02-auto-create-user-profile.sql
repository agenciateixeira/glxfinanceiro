-- =====================================================
-- 02 - FUNCTION E TRIGGER PARA AUTO-CRIAR PERFIL
-- =====================================================
-- Descrição: Cria automaticamente perfil quando usuário se cadastra
-- Ordem: Execute após criar tabelas de users e preferences
-- =====================================================

-- Function para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar registro na tabela users
  INSERT INTO public.users (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );

  -- Criar preferências padrão
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente perfil e preferências quando novo usuário se cadastra';

-- Trigger no auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
