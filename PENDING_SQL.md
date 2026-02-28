# SQL Pendente para Execução

Execute os seguintes comandos SQL no Supabase para completar a funcionalidade de detecção de período:

## 1. Criar tabela de períodos importados

```sql
-- Execute: lib/sql/import_periods.sql
```

## 2. Adicionar coluna import_period_id em transactions

```sql
-- Execute: lib/sql/add_import_period_to_transactions.sql
```

## Como executar:

1. Abra o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole e execute cada arquivo SQL na ordem listada acima

Ou via CLI:
```bash
supabase db push
```
