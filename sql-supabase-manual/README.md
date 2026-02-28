# SQL Supabase - Gestão GLX

Este diretório contém todos os scripts SQL para configurar o banco de dados do sistema GLX no Supabase.

## 📋 Ordem de Execução

Execute os scripts na seguinte ordem:

1. **01-auth-login-cadastro/** - Configuração de autenticação e tabelas de usuários
2. **02-dashboard/** - Tabelas e views para o dashboard
3. **03-perfil/** - Tabelas de perfil e preferências do usuário
4. **04-transacoes/** - Tabelas de transações financeiras
5. **05-categorias/** - Tabelas de categorias e subcategorias
6. **06-metas/** - Tabelas de metas e objetivos financeiros
7. **07-triggers-functions/** - Triggers, functions e procedures

## 🚀 Como Executar

### Opção 1: Interface do Supabase (Recomendado)
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Copie e cole cada arquivo SQL na ordem indicada
5. Execute cada script

### Opção 2: CLI do Supabase
```bash
npx supabase db push
```

## 📝 Estrutura

- Cada pasta contém scripts numerados (01, 02, 03...)
- Execute os scripts dentro de cada pasta na ordem numérica
- Leia os comentários em cada arquivo para entender o propósito

## ⚠️ Importante

- **NÃO** execute os scripts fora de ordem
- Verifique se cada script foi executado com sucesso antes de prosseguir
- Faça backup do banco antes de executar em produção
