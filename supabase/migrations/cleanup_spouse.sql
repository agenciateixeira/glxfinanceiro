-- Script para limpar vínculos de cônjuge problemáticos
-- Execute este SQL no Supabase SQL Editor antes de tentar cadastrar novamente

-- Ver todos os vínculos atuais
SELECT * FROM shared_accounts;

-- Ver todos os usuários (exceto o principal)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- CUIDADO: Deletar todos os vínculos (descomente apenas se tiver certeza)
-- DELETE FROM shared_accounts;

-- Para deletar um usuário específico do cônjuge (substitua o UUID)
-- DELETE FROM auth.users WHERE id = 'uuid-do-conjugue-aqui';
