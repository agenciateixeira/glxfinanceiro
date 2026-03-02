# Sistema de Indicadores Econômicos

Este sistema mantém os indicadores econômicos brasileiros (CDI, IPCA, Selic) atualizados automaticamente através da API do Banco Central do Brasil.

## Funcionamento

### 1. Atualização Automática

O sistema verifica automaticamente se os dados precisam ser atualizados (última atualização >30 dias) e busca novos dados da API do Banco Central.

### 2. Atualização Manual

Você pode forçar a atualização manualmente de duas formas:

#### Via API
```bash
# Verificar e atualizar se necessário
curl http://localhost:3000/api/update-indicators

# Forçar atualização imediata
curl -X POST http://localhost:3000/api/update-indicators
```

#### Via Interface
Use o botão "Atualizar Indicadores" no dashboard (próximo ao PerformanceCard).

### 3. Atualização via Cron Job (Produção)

Para manter os dados sempre atualizados em produção, configure um cron job:

#### Opção 1: Vercel Cron (Recomendado para Vercel)

Adicione ao `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/update-indicators",
      "schedule": "0 0 1 * *"
    }
  ]
}
```
Isso executará a atualização todo dia 1 de cada mês à meia-noite.

#### Opção 2: GitHub Actions

Crie `.github/workflows/update-indicators.yml`:
```yaml
name: Update Economic Indicators

on:
  schedule:
    - cron: '0 0 1 * *' # Todo dia 1 de cada mês
  workflow_dispatch: # Permitir execução manual

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Call Update API
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/update-indicators
```

#### Opção 3: Serviço Externo (cron-job.org, EasyCron, etc)

Configure um job HTTP POST para:
```
URL: https://seu-dominio.com/api/update-indicators
Método: POST
Frequência: Mensal (dia 1, 00:00)
```

## Fonte dos Dados

Os dados vêm da API oficial do Banco Central do Brasil:

- **CDI**: Série 12 - Taxa de juros - CDI
- **IPCA**: Série 433 - IPCA - Variação mensal
- **Selic**: Série 11 - Taxa de juros - Selic

API: https://api.bcb.gov.br/dados/serie/bcdata.sgs/

## Estrutura dos Dados

Cada registro contém:

```typescript
{
  reference_date: string       // Data de referência (YYYY-MM-01)
  cdi_rate: number            // Taxa CDI mensal (%)
  ipca_rate: number           // Taxa IPCA mensal (%)
  selic_rate: number          // Taxa Selic mensal (%)
  cdi_accumulated_12m: number // CDI acumulado 12 meses (%)
  ipca_accumulated_12m: number // IPCA acumulado 12 meses (%)
  selic_accumulated_12m: number // Selic acumulado 12 meses (%)
  created_at: timestamp
  updated_at: timestamp
}
```

## Manutenção

### Verificar última atualização
```sql
SELECT reference_date, updated_at
FROM economic_indicators
ORDER BY reference_date DESC
LIMIT 1;
```

### Forçar atualização manual
```bash
node update-indicators-2026.js
```

### Limpar dados antigos (opcional)
```sql
DELETE FROM economic_indicators
WHERE reference_date < '2024-01-01';
```

## Troubleshooting

### Dados não atualizando

1. Verifique se a API do Banco Central está acessível:
   ```bash
   curl https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json
   ```

2. Verifique os logs do servidor
3. Execute manualmente a atualização via API

### Dados incorretos

1. Delete os registros problemáticos
2. Execute a atualização manual
3. Verifique os cálculos de acumulado 12 meses

## Performance

- A atualização busca os últimos 24 meses
- Tempo médio: 5-10 segundos
- Dados são cacheados no banco
- API do BCB tem rate limit (use com moderação)

## Próximos Passos

- [ ] Adicionar notificação quando houver grande variação nos indicadores
- [ ] Criar dashboard de admin para visualizar histórico de atualizações
- [ ] Implementar cache Redis para melhor performance
- [ ] Adicionar mais indicadores (INCC, IGP-M, etc)
