import { createClient } from '@/lib/supabase/client'

export interface FinancialProjection {
  // Income
  totalMonthlyIncome: number
  person1Income: number
  person2Income: number
  person1NetIncome: number // After taxes
  person2NetIncome: number

  // Fixed Expenses
  totalFixedExpenses: number
  confirmedRecurringExpenses: RecurringExpenseItem[]

  // Variable Expenses (average from last 3 months)
  averageVariableExpenses: number
  variableExpensesByCategory: CategoryExpense[]

  // Projection
  projectedBalance: number
  projectedStatus: 'surplus' | 'tight' | 'deficit'
  daysUntilNextIncome: number
  nextIncomeDate: Date | null

  // Current month stats
  currentMonthIncome: number
  currentMonthExpenses: number
  currentMonthBalance: number
}

export interface RecurringExpenseItem {
  id: string
  description: string
  category_name: string
  category_color: string
  expected_amount: number
  expected_day: number
}

export interface CategoryExpense {
  category_id: string
  category_name: string
  category_color: string
  category_icon: string
  total: number
  percentage: number
}

/**
 * Calcula projeção financeira para os próximos 30 dias
 */
export async function calculateFinancialProjection(userId: string): Promise<FinancialProjection | null> {
  const supabase = createClient()

  try {
    // 1. Buscar configurações financeiras
    const { data: settings, error: settingsError } = await supabase
      .from('financial_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

    // 2. Buscar gastos fixos confirmados
    const { data: recurringExpenses, error: recurringError } = await supabase
      .from('recurring_expenses')
      .select(`
        id,
        description,
        expected_amount,
        expected_day,
        category_id,
        categories (name, color)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (recurringError) throw recurringError

    // 3. Buscar transações dos últimos 3 meses para média de gastos variáveis
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        date,
        category_id,
        categories (name, color, icon)
      `)
      .eq('user_id', userId)
      .gte('date', threeMonthsAgo.toISOString())

    if (transactionsError) throw transactionsError

    // 4. Calcular receitas mensais
    const person1Salary = settings?.person1_salary || 0
    const person2Salary = settings?.person2_salary || 0
    const person1TaxRate = settings?.person1_tax_rate || 0
    const person2TaxRate = settings?.person2_tax_rate || 0

    const person1NetIncome = person1Salary * (1 - person1TaxRate / 100)
    const person2NetIncome = person2Salary * (1 - person2TaxRate / 100)
    const totalMonthlyIncome = person1NetIncome + person2NetIncome

    // 5. Calcular total de gastos fixos
    const confirmedExpenses: RecurringExpenseItem[] = (recurringExpenses || []).map(exp => ({
      id: exp.id,
      description: exp.description,
      category_name: (exp.categories as any)?.name || 'Sem categoria',
      category_color: (exp.categories as any)?.color || '#888888',
      expected_amount: exp.expected_amount,
      expected_day: exp.expected_day || 1,
    }))

    const totalFixedExpenses = confirmedExpenses.reduce((sum, exp) => sum + exp.expected_amount, 0)

    // 6. Calcular média de gastos variáveis (excluindo fixos)
    const recurringExpenseIds = new Set(confirmedExpenses.map(e => e.id))

    const variableTransactions = (transactions || []).filter(
      t => t.type === 'expense' && !recurringExpenseIds.has(t.id)
    )

    const totalVariableExpenses = variableTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const averageVariableExpenses = totalVariableExpenses / 3 // Média dos últimos 3 meses

    // 7. Agrupar gastos variáveis por categoria
    const categoryMap: { [key: string]: CategoryExpense } = {}

    variableTransactions.forEach(t => {
      const catId = t.category_id || 'uncategorized'
      const catName = (t.categories as any)?.name || 'Sem categoria'
      const catColor = (t.categories as any)?.color || '#888888'
      const catIcon = (t.categories as any)?.icon || '📦'

      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          category_id: catId,
          category_name: catName,
          category_color: catColor,
          category_icon: catIcon,
          total: 0,
          percentage: 0,
        }
      }

      categoryMap[catId].total += Number(t.amount)
    })

    // Calcular percentuais
    const variableExpensesByCategory = Object.values(categoryMap).map(cat => ({
      ...cat,
      total: cat.total / 3, // Média mensal
      percentage: totalVariableExpenses > 0 ? (cat.total / totalVariableExpenses) * 100 : 0,
    })).sort((a, b) => b.total - a.total)

    // 8. Calcular projeção de 30 dias
    const projectedBalance = totalMonthlyIncome - (totalFixedExpenses + averageVariableExpenses)

    let projectedStatus: 'surplus' | 'tight' | 'deficit' = 'surplus'
    if (projectedBalance < 0) {
      projectedStatus = 'deficit'
    } else if (projectedBalance < totalMonthlyIncome * 0.1) {
      projectedStatus = 'tight' // Menos de 10% de sobra
    }

    // 9. Calcular próximo dia de recebimento
    const today = new Date()
    const currentDay = today.getDate()

    let nextIncomeDate: Date | null = null
    let daysUntilNextIncome = 0

    if (settings?.person1_payment_day || settings?.person2_payment_day) {
      const paymentDays = [
        settings.person1_payment_day,
        settings.person2_payment_day,
      ].filter(Boolean).sort((a, b) => a! - b!)

      // Encontrar próximo dia de pagamento
      const nextPayDay = paymentDays.find(day => day! > currentDay) || paymentDays[0]

      if (nextPayDay) {
        nextIncomeDate = new Date(today)
        if (nextPayDay > currentDay) {
          nextIncomeDate.setDate(nextPayDay)
        } else {
          // Próximo mês
          nextIncomeDate.setMonth(nextIncomeDate.getMonth() + 1)
          nextIncomeDate.setDate(nextPayDay)
        }

        daysUntilNextIncome = Math.ceil(
          (nextIncomeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    }

    // 10. Stats do mês atual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const currentMonthTransactions = (transactions || []).filter(t => {
      const tDate = new Date(t.date)
      return tDate >= startOfMonth
    })

    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const currentMonthBalance = currentMonthIncome - currentMonthExpenses

    return {
      totalMonthlyIncome,
      person1Income: person1Salary,
      person2Income: person2Salary,
      person1NetIncome,
      person2NetIncome,
      totalFixedExpenses,
      confirmedRecurringExpenses: confirmedExpenses,
      averageVariableExpenses,
      variableExpensesByCategory,
      projectedBalance,
      projectedStatus,
      daysUntilNextIncome,
      nextIncomeDate,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthBalance,
    }
  } catch (error) {
    console.error('Erro ao calcular projeção financeira:', error)
    return null
  }
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

/**
 * Retorna cor baseada no status da projeção
 */
export function getProjectionColor(status: 'surplus' | 'tight' | 'deficit'): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'surplus':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
      }
    case 'tight':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
      }
    case 'deficit':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
      }
  }
}

/**
 * Retorna mensagem baseada no status
 */
export function getProjectionMessage(status: 'surplus' | 'tight' | 'deficit'): string {
  switch (status) {
    case 'surplus':
      return 'Suas finanças estão saudáveis! Você terá uma boa sobra no mês.'
    case 'tight':
      return 'Atenção! Seu orçamento está apertado. Considere reduzir gastos variáveis.'
    case 'deficit':
      return 'Alerta! Seus gastos estão maiores que sua receita. Revise suas despesas urgentemente.'
  }
}
