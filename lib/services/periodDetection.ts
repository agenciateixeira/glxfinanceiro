/**
 * Serviço de detecção de período de importação
 * Analisa as datas das transações e detecta o período automaticamente
 */

import { ParsedTransaction } from './pdfParser'

export interface DetectedPeriod {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  confidence: 'high' | 'medium' | 'low'
  detectionMethod: 'exact' | 'month' | 'range' | 'manual'
  suggestedLabel?: string // Ex: "Fevereiro 2026", "23/02/2026"
}

/**
 * Detecta o período baseado nas transações
 */
export function detectPeriod(transactions: ParsedTransaction[]): DetectedPeriod {
  if (transactions.length === 0) {
    throw new Error('Nenhuma transação fornecida para detectar período')
  }

  // Ordena transações por data
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)

  // Calcula a diferença em dias
  const diffDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

  // Verifica se é um único dia (extrato diário)
  if (diffDays === 0) {
    return {
      startDate: sorted[0].date,
      endDate: sorted[0].date,
      confidence: 'high',
      detectionMethod: 'exact',
      suggestedLabel: formatDate(firstDate, 'day')
    }
  }

  // Verifica se é um mês fechado (28-31 dias, começando no dia 1)
  const isMonthStart = firstDate.getDate() === 1
  const isMonthEnd = isLastDayOfMonth(lastDate)

  if (diffDays >= 28 && diffDays <= 31 && isMonthStart && isMonthEnd) {
    return {
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      confidence: 'high',
      detectionMethod: 'month',
      suggestedLabel: formatDate(firstDate, 'month')
    }
  }

  // Verifica se é aproximadamente um mês (25-35 dias)
  if (diffDays >= 25 && diffDays <= 35) {
    // Ajusta para início e fim do mês
    const adjustedStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
    const adjustedEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0)

    return {
      startDate: formatDateISO(adjustedStart),
      endDate: formatDateISO(adjustedEnd),
      confidence: 'medium',
      detectionMethod: 'month',
      suggestedLabel: formatDate(firstDate, 'month')
    }
  }

  // Período customizado (range de datas)
  return {
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    confidence: diffDays <= 7 ? 'high' : 'low',
    detectionMethod: 'range',
    suggestedLabel: `${formatDate(firstDate, 'day')} a ${formatDate(lastDate, 'day')}`
  }
}

/**
 * Verifica se é o último dia do mês
 */
function isLastDayOfMonth(date: Date): boolean {
  const nextDay = new Date(date)
  nextDay.setDate(date.getDate() + 1)
  return nextDay.getDate() === 1
}

/**
 * Formata data para ISO (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date, format: 'day' | 'month'): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  if (format === 'month') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  // format === 'day'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Verifica se já existe importação para o período
 */
export async function checkDuplicatePeriod(
  userId: string,
  startDate: string,
  endDate: string,
  sourceType: string
): Promise<{ exists: boolean; periodId?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('import_periods')
    .select('id')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .or(`and(period_start.lte.${endDate},period_end.gte.${startDate})`)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error checking duplicate period:', error)
    return { exists: false }
  }

  return {
    exists: !!data,
    periodId: data?.id
  }
}

/**
 * Registra um novo período de importação
 */
export async function registerImportPeriod(
  userId: string,
  period: DetectedPeriod,
  metadata: {
    sourceType: 'pdf' | 'csv' | 'xml' | 'ofx'
    bankName?: string
    fileName?: string
    totalTransactions: number
    totalIncome: number
    totalExpense: number
  }
): Promise<string> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('import_periods')
    .insert({
      user_id: userId,
      period_start: period.startDate,
      period_end: period.endDate,
      source_type: metadata.sourceType,
      bank_name: metadata.bankName,
      file_name: metadata.fileName,
      total_transactions: metadata.totalTransactions,
      total_income: metadata.totalIncome,
      total_expense: metadata.totalExpense
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to register import period: ${error.message}`)
  }

  return data.id
}
