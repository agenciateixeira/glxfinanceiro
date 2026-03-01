import { createClient } from '@/lib/supabase/client'

export interface FinancialInsight {
  type: 'overspending' | 'category_spike' | 'payment_method_alert' | 'goal_blocker' | 'goal_facilitator'
  severity: 'critical' | 'warning' | 'info' | 'positive'
  title: string
  message: string
  data: any
}

export interface GoalProgress {
  goal_id: string
  goal_title: string
  target_amount: number
  current_amount: number
  deadline: string
  progress_percentage: number
  is_achievable: boolean
  monthly_required: number
  blockers: FinancialInsight[]
  facilitators: FinancialInsight[]
}

/**
 * Analisa os gastos do mês atual e identifica padrões problemáticos
 */
export async function analyzeCurrentMonthSpending(userId: string): Promise<FinancialInsight[]> {
  const supabase = createClient()
  const insights: FinancialInsight[] = []

  try {
    // Período: mês atual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Buscar transações do mês atual
    // RLS policies handle user filtering including shared spouse accounts
    const { data: currentMonthTransactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        date,
        payment_method,
        category_id,
        categories (name, color, icon)
      `)
      .eq('type', 'expense')
      .gte('date', startOfMonth.toISOString())

    // Buscar transações do mês passado para comparação
    // RLS policies handle user filtering including shared spouse accounts
    const { data: lastMonthTransactions } = await supabase
      .from('transactions')
      .select('amount, category_id, payment_method')
      .eq('type', 'expense')
      .gte('date', startOfLastMonth.toISOString())
      .lte('date', endOfLastMonth.toISOString())

    if (!currentMonthTransactions) return insights

    const currentTotal = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const lastMonthTotal = (lastMonthTransactions || []).reduce((sum, t) => sum + Number(t.amount), 0)

    // 1. INSIGHT: Overspending geral
    if (lastMonthTotal > 0) {
      const increasePercentage = ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100

      if (increasePercentage > 20) {
        insights.push({
          type: 'overspending',
          severity: 'critical',
          title: 'Alerta: Gastos acima do normal!',
          message: `Você já gastou ${increasePercentage.toFixed(0)}% a mais que o mês passado. Está na hora de revisar seus gastos.`,
          data: {
            currentTotal,
            lastMonthTotal,
            increase: currentTotal - lastMonthTotal,
            percentage: increasePercentage,
          },
        })
      } else if (increasePercentage > 10) {
        insights.push({
          type: 'overspending',
          severity: 'warning',
          title: 'Atenção aos gastos',
          message: `Seus gastos estão ${increasePercentage.toFixed(0)}% maiores que o mês passado.`,
          data: {
            currentTotal,
            lastMonthTotal,
            increase: currentTotal - lastMonthTotal,
            percentage: increasePercentage,
          },
        })
      }
    }

    // 2. INSIGHT: Categoria com pico de gastos
    const categorySpending = new Map<string, { name: string; color: string; icon: string; current: number; last: number }>()

    currentMonthTransactions.forEach(t => {
      const catId = t.category_id || 'uncategorized'
      const catName = (t.categories as any)?.name || 'Sem categoria'
      const catColor = (t.categories as any)?.color || '#888888'
      const catIcon = (t.categories as any)?.icon || '📦'

      if (!categorySpending.has(catId)) {
        categorySpending.set(catId, { name: catName, color: catColor, icon: catIcon, current: 0, last: 0 })
      }
      categorySpending.get(catId)!.current += Number(t.amount)
    })

    ;(lastMonthTransactions || []).forEach(t => {
      const catId = t.category_id || 'uncategorized'
      if (categorySpending.has(catId)) {
        categorySpending.get(catId)!.last += Number(t.amount)
      }
    })

    // Encontrar categorias com aumento >30%
    categorySpending.forEach((data, catId) => {
      if (data.last > 0) {
        const catIncrease = ((data.current - data.last) / data.last) * 100

        if (catIncrease > 30 && data.current > 100) {
          insights.push({
            type: 'category_spike',
            severity: 'warning',
            title: `Pico em ${data.name}`,
            message: `Você gastou ${catIncrease.toFixed(0)}% a mais em ${data.name} este mês. Isso representa R$ ${(data.current - data.last).toFixed(2)} extras.`,
            data: {
              category: data.name,
              categoryIcon: data.icon,
              categoryColor: data.color,
              current: data.current,
              last: data.last,
              increase: catIncrease,
            },
          })
        }
      }
    })

    // 3. INSIGHT: Método de pagamento com alto uso
    const paymentMethodSpending = new Map<string, number>()

    currentMonthTransactions.forEach(t => {
      const method = t.payment_method || 'other'
      paymentMethodSpending.set(method, (paymentMethodSpending.get(method) || 0) + Number(t.amount))
    })

    const sortedMethods = Array.from(paymentMethodSpending.entries()).sort((a, b) => b[1] - a[1])

    if (sortedMethods.length > 0) {
      const [topMethod, topAmount] = sortedMethods[0]
      const methodPercentage = (topAmount / currentTotal) * 100

      if (topMethod === 'credit_card' && methodPercentage > 60) {
        insights.push({
          type: 'payment_method_alert',
          severity: 'warning',
          title: 'Uso excessivo de cartão de crédito',
          message: `${methodPercentage.toFixed(0)}% dos seus gastos estão no cartão de crédito (R$ ${topAmount.toFixed(2)}). Cuidado com a fatura!`,
          data: {
            method: topMethod,
            amount: topAmount,
            percentage: methodPercentage,
          },
        })
      }
    }

    return insights
  } catch (error) {
    console.error('Erro ao analisar gastos:', error)
    return []
  }
}

/**
 * Analisa progresso das metas e identifica bloqueadores e facilitadores
 */
export async function analyzeGoalProgress(userId: string, goalId: string): Promise<GoalProgress | null> {
  const supabase = createClient()

  try {
    // Buscar meta
    // RLS policies handle user filtering including shared spouse accounts
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) return null

    const currentAmount = goal.current_amount || 0
    const targetAmount = goal.target_amount
    const progressPercentage = (currentAmount / targetAmount) * 100

    // Calcular quanto falta e quantos meses até o deadline
    const now = new Date()
    const deadline = new Date(goal.target_date)
    const monthsRemaining = Math.max(
      (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()),
      1
    )

    const amountRemaining = targetAmount - currentAmount
    const monthlyRequired = amountRemaining / monthsRemaining

    // Buscar configurações financeiras
    // RLS policies handle user filtering including shared spouse accounts
    const { data: settings } = await supabase
      .from('financial_settings')
      .select('*')
      .maybeSingle()

    const monthlyIncome = settings
      ? (settings.person1_salary || 0) * (1 - (settings.person1_tax_rate || 0) / 100) +
        (settings.person2_salary || 0) * (1 - (settings.person2_tax_rate || 0) / 100)
      : 0

    // Buscar gastos fixos
    // RLS policies handle user filtering including shared spouse accounts
    const { data: recurringExpenses } = await supabase
      .from('recurring_expenses')
      .select('expected_amount')
      .eq('is_active', true)

    const fixedExpenses = (recurringExpenses || []).reduce((sum, e) => sum + Number(e.expected_amount), 0)

    // Buscar média de gastos variáveis (últimos 3 meses)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    // RLS policies handle user filtering including shared spouse accounts
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, category_id, categories(name, icon, color)')
      .eq('type', 'expense')
      .gte('date', threeMonthsAgo.toISOString())

    const variableExpenses = ((transactions || []).reduce((sum, t) => sum + Number(t.amount), 0)) / 3

    const availableForGoal = monthlyIncome - fixedExpenses - variableExpenses
    const isAchievable = availableForGoal >= monthlyRequired

    // Identificar BLOQUEADORES
    const blockers: FinancialInsight[] = []

    if (!isAchievable) {
      blockers.push({
        type: 'goal_blocker',
        severity: 'critical',
        title: 'Meta difícil de alcançar',
        message: `Você precisa economizar R$ ${monthlyRequired.toFixed(2)}/mês, mas só sobram R$ ${availableForGoal.toFixed(2)} após despesas.`,
        data: { required: monthlyRequired, available: availableForGoal, gap: monthlyRequired - availableForGoal },
      })

      // Analisar quais categorias são os maiores bloqueadores
      const categorySpending = new Map<string, { name: string; icon: string; color: string; total: number }>()

      ;(transactions || []).forEach(t => {
        const catId = t.category_id || 'uncategorized'
        const catName = (t.categories as any)?.name || 'Sem categoria'
        const catIcon = (t.categories as any)?.icon || '📦'
        const catColor = (t.categories as any)?.color || '#888888'

        if (!categorySpending.has(catId)) {
          categorySpending.set(catId, { name: catName, icon: catIcon, color: catColor, total: 0 })
        }
        categorySpending.get(catId)!.total += Number(t.amount)
      })

      // Top 2 categorias com mais gastos
      const topCategories = Array.from(categorySpending.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 2)

      topCategories.forEach(cat => {
        const monthlyAvg = cat.total / 3
        if (monthlyAvg > monthlyRequired * 0.3) {
          // Se categoria representa >30% do que precisa economizar
          blockers.push({
            type: 'goal_blocker',
            severity: 'warning',
            title: `${cat.icon} ${cat.name} está pesando`,
            message: `Você gasta em média R$ ${monthlyAvg.toFixed(2)}/mês em ${cat.name}. Reduzir isso ajudaria a alcançar sua meta.`,
            data: { category: cat.name, amount: monthlyAvg, icon: cat.icon },
          })
        }
      })
    }

    // Identificar FACILITADORES
    const facilitators: FinancialInsight[] = []

    if (isAchievable) {
      facilitators.push({
        type: 'goal_facilitator',
        severity: 'positive',
        title: 'Meta alcançável!',
        message: `Você tem R$ ${availableForGoal.toFixed(2)} disponíveis por mês. Continue economizando R$ ${monthlyRequired.toFixed(2)}/mês e alcançará sua meta!`,
        data: { required: monthlyRequired, available: availableForGoal, surplus: availableForGoal - monthlyRequired },
      })
    }

    // Se progresso está acima de 50%, é um facilitador
    if (progressPercentage > 50) {
      facilitators.push({
        type: 'goal_facilitator',
        severity: 'positive',
        title: 'Mais da metade concluída!',
        message: `Você já completou ${progressPercentage.toFixed(0)}% da sua meta. Continue assim!`,
        data: { progress: progressPercentage },
      })
    }

    return {
      goal_id: goalId,
      goal_title: goal.title,
      target_amount: targetAmount,
      current_amount: currentAmount,
      deadline: goal.target_date,
      progress_percentage: progressPercentage,
      is_achievable: isAchievable,
      monthly_required: monthlyRequired,
      blockers,
      facilitators,
    }
  } catch (error) {
    console.error('Erro ao analisar progresso da meta:', error)
    return null
  }
}

/**
 * Formata método de pagamento em português
 */
export function formatPaymentMethod(method: string): string {
  const methods: { [key: string]: string } = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    cash: 'Dinheiro',
    pix: 'PIX',
    bank_transfer: 'Transferência',
    other: 'Outro',
  }
  return methods[method] || method
}
