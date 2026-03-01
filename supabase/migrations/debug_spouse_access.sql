-- ============================================
-- DEBUG: Verificar acesso de cônjuge
-- ============================================

-- 1. Verificar o vínculo
SELECT
  'Link entre usuários:' as info,
  id,
  user1_id,
  user2_id,
  created_by,
  created_at
FROM shared_accounts;

-- 2. Testar a função get_linked_user_id para ambos os usuários
-- Para o Guilherme (4ea26367-1eae-4c9b-9b26-ea38d575f2b1)
SELECT
  'get_linked_user_id para Guilherme:' as info,
  get_linked_user_id('4ea26367-1eae-4c9b-9b26-ea38d575f2b1'::uuid) as linked_user_id;

-- Para a Luisa (6f2ebb7a-1051-4d31-b578-890d7e2f4772)
SELECT
  'get_linked_user_id para Luisa:' as info,
  get_linked_user_id('6f2ebb7a-1051-4d31-b578-890d7e2f4772'::uuid) as linked_user_id;

-- 3. Ver todas as transações (sem filtro)
SELECT
  'Total de transações no sistema:' as info,
  COUNT(*) as total
FROM transactions;

-- 4. Ver transações por usuário
SELECT
  'Transações por usuário:' as info,
  user_id,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY user_id;

-- 5. Ver as políticas ativas de transactions
SELECT
  'Políticas de transactions:' as info,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'transactions';

-- 6. Testar se a política SELECT está funcionando
-- Simular o que a Luisa veria (executar como service role)
SELECT
  'Simulação: Transações que a Luisa deveria ver:' as info,
  t.id,
  t.description,
  t.amount,
  t.user_id,
  CASE
    WHEN t.user_id = '6f2ebb7a-1051-4d31-b578-890d7e2f4772'::uuid THEN 'Própria'
    WHEN t.user_id = get_linked_user_id('6f2ebb7a-1051-4d31-b578-890d7e2f4772'::uuid) THEN 'Do cônjuge'
    ELSE 'Outro usuário'
  END as ownership
FROM transactions t
WHERE
  t.user_id = '6f2ebb7a-1051-4d31-b578-890d7e2f4772'::uuid
  OR t.user_id = get_linked_user_id('6f2ebb7a-1051-4d31-b578-890d7e2f4772'::uuid)
ORDER BY t.date DESC
LIMIT 10;

-- 7. Verificar se a função está marcada como SECURITY DEFINER
SELECT
  'Configuração da função get_linked_user_id:' as info,
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc
WHERE proname = 'get_linked_user_id';
