-- =====================================================
-- SCRIPT COMPLETO - EXECUTAR TUDO DE UMA VEZ
-- =====================================================
-- ⚠️ ATENÇÃO: Este arquivo executa TODOS os scripts em ordem
-- Use este arquivo se quiser configurar tudo de uma vez
-- OU execute os arquivos individualmente seguindo a ordem das pastas
-- =====================================================

-- Mostrar mensagem inicial
DO $$
BEGIN
  RAISE NOTICE '🚀 Iniciando configuração do banco de dados GLX...';
END $$;

-- =====================================================
-- FASE 1: EXTENSÕES
-- =====================================================
\echo '📦 Fase 1: Habilitando extensões...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =====================================================
-- FASE 2: ENUMS
-- =====================================================
\echo '🏷️  Fase 2: Criando tipos enumerados...'

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'cash', 'pix', 'bank_transfer', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- FASE 3: TABELAS BASE (sem dependências)
-- =====================================================
\echo '📋 Fase 3: Criando tabelas base...'

-- Primeiro: Users (base para tudo)
\i 01-auth-login-cadastro/02-create-users-table.sql

-- Depois: Preferences (depende de users)
\i 01-auth-login-cadastro/03-create-user-preferences.sql

-- Categorias (depende de users mas independente)
\i 05-categorias/01-create-categories-table.sql

-- =====================================================
-- FASE 4: DADOS INICIAIS (categorias padrão)
-- =====================================================
\echo '💾 Fase 4: Inserindo categorias padrão...'

\i 05-categorias/02-insert-default-categories.sql

-- =====================================================
-- FASE 5: TABELAS COM DEPENDÊNCIAS
-- =====================================================
\echo '📊 Fase 5: Criando tabelas dependentes...'

-- Transações (depende de users e categories)
\i 04-transacoes/01-create-transactions-table.sql

-- Metas (depende de users)
\i 06-metas/01-create-goals-table.sql

-- =====================================================
-- FASE 6: VIEWS (dependem das tabelas)
-- =====================================================
\echo '👁️  Fase 6: Criando views...'

\i 02-dashboard/01-create-dashboard-views.sql

-- =====================================================
-- FASE 7: FUNCTIONS E TRIGGERS
-- =====================================================
\echo '⚡ Fase 7: Criando functions e triggers...'

\i 07-triggers-functions/01-auto-update-timestamp.sql
\i 07-triggers-functions/02-auto-create-user-profile.sql
\i 07-triggers-functions/03-update-goal-status.sql

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Configuração concluída com sucesso!';
  RAISE NOTICE '📊 Banco de dados GLX está pronto para uso';
END $$;
