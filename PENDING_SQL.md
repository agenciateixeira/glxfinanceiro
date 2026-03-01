# SQL Pendente para Execução

Execute os seguintes comandos SQL no Supabase:

## 1. Criar tabela de períodos importados

```sql
-- Execute: lib/sql/import_periods.sql
```

## 2. Adicionar coluna import_period_id em transactions

```sql
-- Execute: lib/sql/add_import_period_to_transactions.sql
```

## 3. Criar tabela de configurações financeiras (Casal)

```sql
-- Execute: lib/sql/financial_settings.sql
```

## 4. Criar tabela de gastos fixos recorrentes

```sql
-- Execute: lib/sql/recurring_expenses.sql
```

## 5. Criar tabela de metas financeiras

```sql
-- Execute: lib/sql/goals.sql
```

## 6. Adicionar coluna person em recurring_expenses

```sql
-- Execute: lib/sql/add_person_to_recurring_expenses.sql
```

## 7. Criar tabela de configuração de layout do dashboard

```sql
-- Execute: lib/sql/dashboard_layout.sql
```

## Como executar:

1. Abra o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole e execute cada arquivo SQL na ordem listada acima

Ou via CLI:
```bash
supabase db push
```
