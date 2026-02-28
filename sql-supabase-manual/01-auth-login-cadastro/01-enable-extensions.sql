-- =====================================================
-- 01 - HABILITAR EXTENSÕES NECESSÁRIAS
-- =====================================================
-- Descrição: Habilita extensões do PostgreSQL necessárias
-- Ordem: Execute PRIMEIRO
-- =====================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para funções de criptografia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensão para busca de texto completo em português
CREATE EXTENSION IF NOT EXISTS "unaccent";
