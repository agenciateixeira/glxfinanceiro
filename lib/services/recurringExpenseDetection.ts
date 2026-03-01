import { createClient } from '@/lib/supabase/client'

export interface RecurringExpense {
  id: string
  description: string
  category_id: string
  category_name: string
  average_amount: number
  occurrences: number
  last_occurrence: string
  confidence: 'high' | 'medium' | 'low'
  transaction_ids: string[]
}

interface TransactionPattern {
  description: string
  category_id: string
  category_name: string
  amounts: number[]
  dates: string[]
  transaction_ids: string[]
}

/**
 * Detecta gastos recorrentes analisando padrões de transações
 *
 * Critérios para identificar gastos fixos:
 * - Transações de despesa (type = 'expense')
 * - Valor similar (variação de até 10%)
 * - Ocorre pelo menos 3 vezes nos últimos meses
 * - Intervalos mensais (aproximadamente 25-35 dias entre ocorrências)
 */
export async function detectRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
  const supabase = createClient()

  // Buscar transações dos últimos 6 meses
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // RLS policies handle user filtering including shared spouse accounts
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      date,
      type,
      category_id,
      categories (name)
    `)
    .eq('type', 'expense')
    .gte('date', sixMonthsAgo.toISOString())
    .order('date', { ascending: true })

  if (error || !transactions) {
    console.error('Erro ao buscar transações:', error)
    return []
  }

  // Agrupar transações por descrição normalizada
  const patterns: { [key: string]: TransactionPattern } = {}

  transactions.forEach((transaction) => {
    const normalizedDesc = normalizeDescription(transaction.description)
    const key = `${normalizedDesc}_${transaction.category_id}`

    if (!patterns[key]) {
      patterns[key] = {
        description: transaction.description,
        category_id: transaction.category_id,
        category_name: (transaction.categories as any)?.name || 'Sem categoria',
        amounts: [],
        dates: [],
        transaction_ids: [],
      }
    }

    patterns[key].amounts.push(transaction.amount)
    patterns[key].dates.push(transaction.date)
    patterns[key].transaction_ids.push(transaction.id)
  })

  // Analisar padrões e identificar recorrências
  const recurringExpenses: RecurringExpense[] = []

  Object.values(patterns).forEach((pattern) => {
    // Precisa ter pelo menos 3 ocorrências
    if (pattern.amounts.length < 3) return

    // Calcular valor médio e variação
    const avgAmount = pattern.amounts.reduce((sum, val) => sum + val, 0) / pattern.amounts.length
    const maxVariation = Math.max(...pattern.amounts.map(amt => Math.abs(amt - avgAmount) / avgAmount))

    // Variação não pode ser maior que 10%
    if (maxVariation > 0.1) return

    // Verificar se os intervalos são aproximadamente mensais
    const intervals = calculateIntervals(pattern.dates)
    const isMonthlyRecurring = intervals.filter(interval => interval >= 25 && interval <= 35).length >= intervals.length * 0.7

    if (!isMonthlyRecurring) return

    // Calcular confiança
    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (pattern.amounts.length >= 5 && maxVariation <= 0.05) {
      confidence = 'high'
    } else if (pattern.amounts.length >= 3 && maxVariation <= 0.1) {
      confidence = 'medium'
    }

    recurringExpenses.push({
      id: pattern.transaction_ids[0], // Usar ID da primeira transação como referência
      description: pattern.description,
      category_id: pattern.category_id,
      category_name: pattern.category_name,
      average_amount: avgAmount,
      occurrences: pattern.amounts.length,
      last_occurrence: pattern.dates[pattern.dates.length - 1],
      confidence,
      transaction_ids: pattern.transaction_ids,
    })
  })

  // Ordenar por valor médio (maiores primeiro)
  return recurringExpenses.sort((a, b) => b.average_amount - a.average_amount)
}

/**
 * Normaliza descrição removendo números, espaços extras e caracteres especiais
 * para melhor agrupamento de transações similares
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, '') // Remove números
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim()
}

/**
 * Calcula intervalos em dias entre datas
 */
function calculateIntervals(dates: string[]): number[] {
  const intervals: number[] = []

  for (let i = 1; i < dates.length; i++) {
    const date1 = new Date(dates[i - 1])
    const date2 = new Date(dates[i])
    const diffTime = Math.abs(date2.getTime() - date1.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    intervals.push(diffDays)
  }

  return intervals
}

/**
 * Formata valor em moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
