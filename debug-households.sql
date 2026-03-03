-- ============================================
-- DEBUG: Verificar household assignments e transações
-- ============================================

-- 1. Verificar usuários e seus households
SELECT
  u.id as user_id,
  au.email,
  u.household_id,
  h.family_name,
  h.household_type
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN households h ON u.household_id = h.id
WHERE au.email IN ('guilherme@agenciagtx.com.br', 'guisdomkt@gmail.com', 'luisaazevedo1712@gmail.com')
ORDER BY au.email;

-- 2. Verificar quantas transações cada household tem
SELECT
  h.id as household_id,
  h.family_name,
  h.household_type,
  COUNT(t.id) as transaction_count
FROM households h
LEFT JOIN transactions t ON h.id = t.household_id
GROUP BY h.id, h.family_name, h.household_type
ORDER BY h.family_name;

-- 3. Verificar se há transações sem household_id
SELECT
  COUNT(*) as transactions_without_household
FROM transactions
WHERE household_id IS NULL;

-- 4. Verificar transações do usuário guilherme@agenciagtx.com.br
SELECT
  t.id,
  t.description,
  t.amount,
  t.user_id,
  au.email as user_email,
  t.household_id,
  h.family_name
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN households h ON t.household_id = h.id
WHERE au.email = 'guilherme@agenciagtx.com.br'
ORDER BY t.created_at DESC
LIMIT 10;

-- 5. Verificar todas as transações e seus households
SELECT
  au.email as user_email,
  t.household_id,
  h.family_name,
  COUNT(t.id) as count
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN households h ON t.household_id = h.id
GROUP BY au.email, t.household_id, h.family_name
ORDER BY au.email;
