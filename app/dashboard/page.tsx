'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import {
  calculateFinancialProjection,
  formatCurrency,
  getProjectionColor,
  getProjectionMessage,
  type FinancialProjection,
} from '@/lib/services/financialProjection'
import {
  analyzeCurrentMonthSpending,
  analyzeGoalProgress,
  type FinancialInsight,
  type GoalProgress,
} from '@/lib/services/financialInsights'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
  Sparkles,
  Lightbulb,
  Target,
  XCircle,
  Info,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PeriodFilter, Period } from '@/components/dashboard/PeriodFilter'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useWidgetLayout } from '@/hooks/useWidgetLayout'
import { DraggableWidget } from '@/components/dashboard/DraggableWidget'
import { EditModeBar } from '@/components/dashboard/EditModeBar'
import { Edit3 } from 'lucide-react'
import { BankAccountsWidget } from '@/components/dashboard/BankAccountsWidget'
import { PerformanceCard } from '@/components/dashboard/PerformanceCard'
import { TopExpensesCard } from '@/components/dashboard/TopExpensesCard'

interface RecentTransaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
  category_name: string | null
  category_icon: string | null
  category_color: string | null
}

interface UpcomingExpense {
  id: string
  description: string
  expected_amount: number
  expected_day: number
  category_icon: string | null
  category_color: string | null
  days_until: number
}

interface MonthlyComparison {
  incomeChange: number
  expensesChange: number
  balanceChange: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [projection, setProjection] = useState<FinancialProjection | null>(null)
  const [insights, setInsights] = useState<FinancialInsight[]>([])
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison>({
    incomeChange: 0,
    expensesChange: 0,
    balanceChange: 0,
  })
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [economicIndicators, setEconomicIndicators] = useState<any>(null)
  const [topExpenses, setTopExpenses] = useState<any[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [patrimonyGrowth, setPatrimonyGrowth] = useState(0)

  // Hook para gerenciar layout dos widgets
  const { widgets, isLoading: isLoadingLayout, updateWidgetOrder, toggleWidgetVisibility, resetToDefault } = useWidgetLayout(user?.id)

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de iniciar o drag
      },
    })
  )

  // Handlers do modo de edição
  const handleEnterEditMode = () => setIsEditMode(true)
  const handleExitEditMode = () => setIsEditMode(false)
  const handleSaveLayout = () => {
    setIsEditMode(false)
    // O hook já salva automaticamente, não precisa fazer nada extra
  }
  const handleResetLayout = async () => {
    await resetToDefault()
  }

  // Handler do drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id)
      const newIndex = widgets.findIndex(w => w.id === over.id)

      const newOrder = arrayMove(widgets, oldIndex, newIndex)
      const widgetIds = newOrder.map(w => w.id)

      updateWidgetOrder(widgetIds)
    }
  }

  // Helper para verificar se widget está visível
  const isWidgetVisible = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    return widget?.isVisible ?? true
  }

  // Helper para obter a posição de um widget
  const getWidgetOrder = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    return widget?.position ?? 0
  }

  const getDateFilter = () => {
    const now = new Date()
    const periodMap = {
      '7d': 7,
      '15d': 15,
      '30d': 30,
      '90d': 90
    }

    if (period === 'all') {
      return null
    }

    const days = periodMap[period as keyof typeof periodMap]
    const date = new Date(now)
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  const loadDashboardData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      console.log('[Dashboard] Iniciando carregamento...')

      // Carregar projeção
      console.log('[Dashboard] Carregando projeção...')
      const projectionData = await calculateFinancialProjection(user.id)
      console.log('[Dashboard] Projeção carregada:', projectionData)
      setProjection(projectionData)

      // Carregar insights de gastos
      console.log('[Dashboard] Carregando insights...')
      const insightsData = await analyzeCurrentMonthSpending(user.id)
      console.log('[Dashboard] Insights carregados:', insightsData)
      setInsights(insightsData)

      // Buscar meta ativa para análise
      // RLS policies handle user filtering including shared spouse accounts
      const { data: activeGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeGoal) {
        const goalProgressData = await analyzeGoalProgress(user.id, activeGoal.id)
        setGoalProgress(goalProgressData)
      }

      // Buscar transações recentes
      // IMPORTANTE: Não filtrar por user_id aqui - deixar as políticas RLS fazerem isso
      // Isso permite que cônjuges vejam as transações compartilhadas
      const dateFilter = getDateFilter()
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          type,
          date,
          categories (
            name,
            icon,
            color
          )
        `)

      if (dateFilter) {
        transactionsQuery = transactionsQuery.gte('date', dateFilter)
      }

      const { data: transactions } = await transactionsQuery
        .order('date', { ascending: false })
        .limit(5)

      if (transactions) {
        setRecentTransactions(
          transactions.map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date,
            category_name: t.categories?.name || null,
            category_icon: t.categories?.icon || null,
            category_color: t.categories?.color || null,
          }))
        )
      }

      // Buscar próximos gastos fixos
      const today = new Date()
      const currentDay = today.getDate()

      // RLS policies handle user filtering including shared spouse accounts
      const { data: recurring } = await supabase
        .from('recurring_expenses')
        .select(`
          id,
          description,
          expected_amount,
          expected_day,
          categories (
            icon,
            color
          )
        `)
        .eq('is_active', true)
        .not('expected_day', 'is', null)
        .order('expected_day', { ascending: true })

      if (recurring) {
        const upcomingList = recurring
          .map((e: any) => {
            const daysUntil = e.expected_day >= currentDay
              ? e.expected_day - currentDay
              : (30 - currentDay) + e.expected_day
            return {
              id: e.id,
              description: e.description,
              expected_amount: e.expected_amount,
              expected_day: e.expected_day,
              category_icon: e.categories?.icon || null,
              category_color: e.categories?.color || null,
              days_until: daysUntil,
            }
          })
          .sort((a, b) => a.days_until - b.days_until)
          .slice(0, 3)

        setUpcomingExpenses(upcomingList)
      }

      // Calcular comparação baseada no período selecionado
      const now = new Date()
      const currentPeriodStart = dateFilter ? new Date(dateFilter) : null

      let lastPeriodStart: Date | null = null
      let lastPeriodEnd: Date | null = null

      if (period !== 'all' && currentPeriodStart) {
        const periodMap = { '7d': 7, '15d': 15, '30d': 30, '90d': 90 }
        const days = periodMap[period as keyof typeof periodMap]

        lastPeriodEnd = new Date(currentPeriodStart)
        lastPeriodEnd.setDate(lastPeriodEnd.getDate() - 1)

        lastPeriodStart = new Date(lastPeriodEnd)
        lastPeriodStart.setDate(lastPeriodStart.getDate() - days + 1)
      }

      // Transações do período atual
      // RLS aplicará automaticamente o filtro para incluir transações compartilhadas
      let currentQuery = supabase
        .from('transactions')
        .select('amount, type')

      if (currentPeriodStart) {
        currentQuery = currentQuery
          .gte('date', currentPeriodStart.toISOString())
          .lte('date', now.toISOString())
      }

      const { data: currentPeriodTransactions } = await currentQuery

      // Transações do período anterior
      // RLS aplicará automaticamente o filtro para incluir transações compartilhadas
      let lastQuery = supabase
        .from('transactions')
        .select('amount, type')

      if (lastPeriodStart && lastPeriodEnd) {
        lastQuery = lastQuery
          .gte('date', lastPeriodStart.toISOString())
          .lte('date', lastPeriodEnd.toISOString())
      }

      const { data: lastPeriodTransactions } = await lastQuery

      const currentIncome = currentPeriodTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
      const currentExpenses = currentPeriodTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0
      const currentBalance = currentIncome - currentExpenses

      const lastIncome = lastPeriodTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
      const lastExpenses = lastPeriodTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0
      const lastBalance = lastIncome - lastExpenses

      const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0
      const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0
      const balanceChange = lastBalance !== 0 ? ((currentBalance - lastBalance) / Math.abs(lastBalance)) * 100 : 0

      setMonthlyComparison({
        incomeChange,
        expensesChange,
        balanceChange,
      })

      // Buscar indicadores econômicos mais recentes
      const { data: indicators } = await supabase
        .from('economic_indicators')
        .select('*')
        .order('reference_date', { ascending: false })
        .limit(2) // Pegar os 2 últimos meses para calcular crescimento

      if (indicators && indicators.length > 0) {
        setEconomicIndicators(indicators[0])
      }

      // Buscar top despesas do mês atual
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data: monthlyExpenses } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          date,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('type', 'expense')
        .gte('date', currentMonthStart.toISOString())
        .lte('date', currentMonthEnd.toISOString())
        .order('amount', { ascending: false })

      if (monthlyExpenses) {
        const expenses = monthlyExpenses.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          category_name: e.categories?.name || 'Sem categoria',
          category_color: e.categories?.color || '#gray',
          category_icon: e.categories?.icon || '📦',
          date: e.date,
        }))
        setTopExpenses(expenses)
        const total = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0)
        setTotalExpenses(total)
      }

      // Calcular crescimento do patrimônio (baseado no saldo dos últimos 2 meses)
      if (indicators && indicators.length >= 2) {
        // Buscar saldo do mês atual
        const thisMonth = new Date()
        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
        const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
        const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

        // Saldo do mês passado
        const { data: lastMonthTransactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', lastMonthStart.toISOString())
          .lte('date', lastMonthEnd.toISOString())

        const lastMonthIncome = lastMonthTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
        const lastMonthExpenses = lastMonthTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0
        const lastMonthBalance = lastMonthIncome - lastMonthExpenses

        // Saldo do mês atual
        const thisMonthBalance = currentIncome - currentExpenses

        // Calcular crescimento percentual
        if (lastMonthBalance > 0) {
          const growth = ((thisMonthBalance - lastMonthBalance) / lastMonthBalance) * 100
          setPatrimonyGrowth(growth)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, period])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[#D4C5B9] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Calculando projeção financeira...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Se não há configuração, mostrar onboarding
  if (!projection || projection.totalMonthlyIncome === 0) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Configure suas informações para ver a projeção financeira
            </p>
          </div>

          {/* Onboarding Card */}
          <div className="bg-gradient-to-br from-[#D4C5B9] to-[#C4B5A9] rounded-2xl p-8 sm:p-12 text-white">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Bem-vindo ao GLX!
              </h2>
              <p className="text-lg opacity-90 mb-8">
                Configure seus dados financeiros para receber uma projeção inteligente dos próximos 30 dias
              </p>
              <Link href="/transactions/settings">
                <Button
                  size="lg"
                  className="bg-white text-[#D4C5B9] hover:bg-gray-100"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Configurar Finanças
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Projeção 30 Dias
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Saiba se terá sobra ou déficit baseado em suas receitas e despesas fixas
              </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Detecção Automática
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sistema identifica seus gastos fixos recorrentes automaticamente
              </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a] sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Gestão Inteligente
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Controle completo das finanças do casal em um só lugar
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const projectionColors = getProjectionColor(projection.projectedStatus)
  const projectionMessage = getProjectionMessage(projection.projectedStatus)

  // Componente para indicador de mudança percentual
  const PercentageIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    if (value === 0) return null

    const isPositive = inverse ? value < 0 : value > 0
    const colorClass = isPositive
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Projeção financeira dos próximos 30 dias
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            {!isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterEditMode}
                className="h-9 px-3 border-gray-300 dark:border-gray-600"
                title="Editar layout do dashboard"
              >
                <Edit3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Edit Mode Bar */}
        {isEditMode && (
          <EditModeBar
            onSave={handleSaveLayout}
            onCancel={handleExitEditMode}
            onReset={handleResetLayout}
            hasChanges={true}
          />
        )}

        {/* Widgets Grid - Com DndContext */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col space-y-6">
              {/* Projection Alert */}
              {(isEditMode || isWidgetVisible('projection-alert')) && (
                <DraggableWidget
                  id="projection-alert"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('projection-alert')}
                  label="Alerta de Projeção"
                  onToggleVisibility={() => toggleWidgetVisibility('projection-alert')}
                  order={getWidgetOrder('projection-alert')}
                >
                  <div className={`rounded-xl p-4 sm:p-6 border ${projectionColors.bg} ${projectionColors.border}`}>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0">
                        {projection.projectedStatus === 'surplus' ? (
                          <CheckCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${projectionColors.text}`} />
                        ) : projection.projectedStatus === 'tight' ? (
                          <Clock className={`h-6 w-6 sm:h-7 sm:w-7 ${projectionColors.text}`} />
                        ) : (
                          <AlertTriangle className={`h-6 w-6 sm:h-7 sm:w-7 ${projectionColors.text}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base sm:text-lg font-bold ${projectionColors.text} mb-1`}>
                          {projection.projectedStatus === 'surplus' ? 'Finanças Saudáveis' :
                           projection.projectedStatus === 'tight' ? 'Orçamento Apertado' :
                           'Alerta de Déficit'}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {projectionMessage}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Projeção</p>
                        <p className={`text-lg sm:text-xl font-bold ${projectionColors.text}`}>
                          {formatCurrency(projection.projectedBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </DraggableWidget>
              )}

              {/* Bank Accounts Widget */}
              {(isEditMode || isWidgetVisible('bank-accounts')) && (
                <DraggableWidget
                  id="bank-accounts"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('bank-accounts')}
                  label="Contas Bancárias"
                  onToggleVisibility={() => toggleWidgetVisibility('bank-accounts')}
                  order={getWidgetOrder('bank-accounts')}
                >
                  <BankAccountsWidget />
                </DraggableWidget>
              )}

              {/* Financial Insights */}
              {insights.length > 0 && (isEditMode || isWidgetVisible('financial-insights')) && (
                <DraggableWidget
                  id="financial-insights"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('financial-insights')}
                  label="Insights Financeiros"
                  onToggleVisibility={() => toggleWidgetVisibility('financial-insights')}
                  order={getWidgetOrder('financial-insights')}
                >
                  <div className="space-y-3">
                    {insights.map((insight, index) => {
              const severityColors = {
                critical: {
                  bg: 'bg-rose-50 dark:bg-rose-950/20',
                  border: 'border-rose-200 dark:border-rose-800',
                  text: 'text-rose-600 dark:text-rose-400',
                  icon: 'text-rose-600 dark:text-rose-400',
                },
                warning: {
                  bg: 'bg-amber-50 dark:bg-amber-950/20',
                  border: 'border-amber-200 dark:border-amber-800',
                  text: 'text-amber-600 dark:text-amber-400',
                  icon: 'text-amber-600 dark:text-amber-400',
                },
                info: {
                  bg: 'bg-blue-50 dark:bg-blue-950/20',
                  border: 'border-blue-200 dark:border-blue-800',
                  text: 'text-blue-600 dark:text-blue-400',
                  icon: 'text-blue-600 dark:text-blue-400',
                },
                positive: {
                  bg: 'bg-emerald-50 dark:bg-emerald-950/20',
                  border: 'border-emerald-200 dark:border-emerald-800',
                  text: 'text-emerald-600 dark:text-emerald-400',
                  icon: 'text-emerald-600 dark:text-emerald-400',
                },
              }[insight.severity]

              const InsightIcon = insight.type === 'payment_method_alert' ? CreditCard :
                                  insight.type === 'category_spike' ? TrendingUp :
                                  Lightbulb

              return (
                <div
                  key={index}
                  className={`rounded-xl p-4 sm:p-5 border ${severityColors.bg} ${severityColors.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <InsightIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${severityColors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm sm:text-base font-bold ${severityColors.text} mb-1`}>
                        {insight.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {insight.message}
                      </p>
                      {insight.type === 'category_spike' && insight.data.categoryIcon && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-2xl">{insight.data.categoryIcon}</span>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {insight.data.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                      </div>
                    )
                  })}
                  </div>
                </DraggableWidget>
              )}

              {/* Performance Card */}
              {economicIndicators && (isEditMode || isWidgetVisible('performance-card')) && (
                <DraggableWidget
                  id="performance-card"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('performance-card')}
                  label="Performance vs Benchmarks"
                  onToggleVisibility={() => toggleWidgetVisibility('performance-card')}
                  order={getWidgetOrder('performance-card')}
                >
                  <PerformanceCard
                    patrimonyGrowth={patrimonyGrowth}
                    cdiRate={economicIndicators.cdi_rate || 0}
                    ipcaRate={economicIndicators.ipca_rate || 0}
                    month={new Date(economicIndicators.reference_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  />
                </DraggableWidget>
              )}

              {/* Top Expenses Card */}
              {topExpenses.length > 0 && (isEditMode || isWidgetVisible('top-expenses-card')) && (
                <DraggableWidget
                  id="top-expenses-card"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('top-expenses-card')}
                  label="Top 10 Maiores Despesas"
                  onToggleVisibility={() => toggleWidgetVisibility('top-expenses-card')}
                  order={getWidgetOrder('top-expenses-card')}
                >
                  <TopExpensesCard
                    expenses={topExpenses}
                    totalExpenses={totalExpenses}
                  />
                </DraggableWidget>
              )}

              {/* Goal Progress */}
              {goalProgress && (isEditMode || isWidgetVisible('goal-progress')) && (
                <DraggableWidget
                  id="goal-progress"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('goal-progress')}
                  label="Progresso da Meta"
                  onToggleVisibility={() => toggleWidgetVisibility('goal-progress')}
                  order={getWidgetOrder('goal-progress')}
                >
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {goalProgress.goal_title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Meta: {formatCurrency(goalProgress.target_amount)} até{' '}
                  {new Date(goalProgress.deadline).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(goalProgress.current_amount)} de {formatCurrency(goalProgress.target_amount)}
                </span>
                <span className={`text-sm font-bold ${
                  goalProgress.progress_percentage >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                  goalProgress.progress_percentage >= 50 ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {goalProgress.progress_percentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    goalProgress.progress_percentage >= 100 ? 'bg-emerald-500' :
                    goalProgress.progress_percentage >= 50 ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(goalProgress.progress_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Monthly Required */}
            <div className={`p-3 rounded-lg mb-4 ${
              goalProgress.is_achievable
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800'
            }`}>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Necessário por mês:</p>
              <p className={`text-lg font-bold ${
                goalProgress.is_achievable
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatCurrency(goalProgress.monthly_required)}
              </p>
            </div>

            {/* Blockers and Facilitators */}
            {(goalProgress.blockers.length > 0 || goalProgress.facilitators.length > 0) && (
              <div className="space-y-3">
                {/* Blockers */}
                {goalProgress.blockers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        O que está atrapalhando:
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {goalProgress.blockers.map((blocker, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800"
                        >
                          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                            {blocker.title}
                          </p>
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                            {blocker.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilitators */}
                {goalProgress.facilitators.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        O que está ajudando:
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {goalProgress.facilitators.map((facilitator, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                        >
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {facilitator.title}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            {facilitator.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                    </div>
                  )}
                  </div>
                </DraggableWidget>
              )}
              {/* Recent Transactions Widget */}
              {(isEditMode || isWidgetVisible('recent-transactions')) && (
                <DraggableWidget
                  id="recent-transactions"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('recent-transactions')}
                  label="Transações Recentes"
                  onToggleVisibility={() => toggleWidgetVisibility('recent-transactions')}
                  order={getWidgetOrder('recent-transactions')}
                >
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Transações Recentes
              </h2>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="text-[#D4C5B9] hover:text-[#C4B5A9]">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: transaction.category_color ? `${transaction.category_color}20` : '#f3f4f620' }}
                    >
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-5 w-5" style={{ color: transaction.category_color || '#10b981' }} />
                      ) : (
                        <TrendingDown className="h-5 w-5" style={{ color: transaction.category_color || '#ef4444' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {transaction.category_name && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${transaction.category_color}20`,
                              color: transaction.category_color,
                            }}
                          >
                            {transaction.category_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold flex-shrink-0 ${
                        transaction.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Nenhuma transação encontrada
                </p>
                <Link href="/transactions">
                  <Button size="sm" className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white">
                    Adicionar Transação
                  </Button>
                </Link>
              </div>
            )}
          </div>
                </DraggableWidget>
              )}

              {/* Upcoming Expenses Widget */}
              {(isEditMode || isWidgetVisible('upcoming-expenses')) && (
                <DraggableWidget
                  id="upcoming-expenses"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('upcoming-expenses')}
                  label="Próximos Gastos Fixos"
                  onToggleVisibility={() => toggleWidgetVisibility('upcoming-expenses')}
                  order={getWidgetOrder('upcoming-expenses')}
                >
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Gastos Fixos
              </h2>
              <Link href="/transactions/recurring-expenses">
                <Button variant="ghost" size="sm" className="text-[#D4C5B9] hover:text-[#C4B5A9]">
                  Gerenciar
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {upcomingExpenses.length > 0 ? (
              <div className="space-y-3">
                {upcomingExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg"
                  >
                    {expense.category_icon && (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${expense.category_color}20` }}
                      >
                        <span className="text-xl">{expense.category_icon}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {expense.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {expense.days_until === 0
                            ? 'Hoje'
                            : expense.days_until === 1
                            ? 'Amanhã'
                            : `Em ${expense.days_until} dias`}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Dia {expense.expected_day}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                      {formatCurrency(expense.expected_amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Nenhum gasto fixo agendado
                </p>
                <Link href="/transactions/recurring-expenses">
                  <Button size="sm" className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white">
                    Adicionar Gasto Fixo
                  </Button>
                </Link>
              </div>
            )}
          </div>
                </DraggableWidget>
              )}

              {/* Monthly Comparison Summary */}
              {(monthlyComparison.incomeChange !== 0 || monthlyComparison.expensesChange !== 0) && (isEditMode || isWidgetVisible('comparison')) && (
                <DraggableWidget
                  id="comparison"
                  isEditMode={isEditMode}
                  isVisible={isWidgetVisible('comparison')}
                  label="Comparativo do Período"
                  onToggleVisibility={() => toggleWidgetVisibility('comparison')}
                  order={getWidgetOrder('comparison')}
                >
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Comparativo do Período
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Mudanças em relação ao período anterior
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Income Comparison */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Receitas</span>
                  <PercentageIndicator value={monthlyComparison.incomeChange} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {monthlyComparison.incomeChange > 0 ? 'Aumento' : monthlyComparison.incomeChange < 0 ? 'Redução' : 'Estável'} em relação ao período anterior
                </p>
              </div>

              {/* Expenses Comparison */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas</span>
                  <PercentageIndicator value={monthlyComparison.expensesChange} inverse />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {monthlyComparison.expensesChange > 0 ? 'Aumento' : monthlyComparison.expensesChange < 0 ? 'Redução' : 'Estável'} nos gastos do período
                </p>
              </div>

              {/* Balance Comparison */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo</span>
                  <PercentageIndicator value={monthlyComparison.balanceChange} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {monthlyComparison.balanceChange > 0 ? 'Melhora' : monthlyComparison.balanceChange < 0 ? 'Piora' : 'Mantido'} no saldo
                </p>
                  </div>
                </div>
                  </div>
                </DraggableWidget>
              )}

              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Income */}
                {(isEditMode || isWidgetVisible('income-stat')) && (
                  <DraggableWidget
                    id="income-stat"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('income-stat')}
                    label="Receita Mensal"
                    onToggleVisibility={() => toggleWidgetVisibility('income-stat')}
                    order={getWidgetOrder('income-stat')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Receita Mensal</p>
                  <PercentageIndicator value={monthlyComparison.incomeChange} />
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(projection.totalMonthlyIncome)}
                </p>
              </div>
            </div>
            {projection.daysUntilNextIncome > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>Próxima em {projection.daysUntilNextIncome} dias</span>
              </div>
                    )}
                    </div>
                  </DraggableWidget>
                )}

                {/* Fixed Expenses */}
                {(isEditMode || isWidgetVisible('fixed-expenses-stat')) && (
                  <DraggableWidget
                    id="fixed-expenses-stat"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('fixed-expenses-stat')}
                    label="Gastos Fixos"
                    onToggleVisibility={() => toggleWidgetVisibility('fixed-expenses-stat')}
                    order={getWidgetOrder('fixed-expenses-stat')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Gastos Fixos</p>
                  <PercentageIndicator value={monthlyComparison.expensesChange} inverse />
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(projection.totalFixedExpenses)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
                    {projection.confirmedRecurringExpenses.length} gastos recorrentes
                      </p>
                    </div>
                  </DraggableWidget>
                )}

                {/* Variable Expenses */}
                {(isEditMode || isWidgetVisible('variable-expenses-stat')) && (
                  <DraggableWidget
                    id="variable-expenses-stat"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('variable-expenses-stat')}
                    label="Gastos Variáveis"
                    onToggleVisibility={() => toggleWidgetVisibility('variable-expenses-stat')}
                    order={getWidgetOrder('variable-expenses-stat')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Gastos Variáveis</p>
                  <PercentageIndicator value={monthlyComparison.expensesChange} inverse />
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(projection.averageVariableExpenses)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
                    Média últimos 3 meses
                      </p>
                    </div>
                  </DraggableWidget>
                )}

                {/* Current Month */}
                {(isEditMode || isWidgetVisible('balance-stat')) && (
                  <DraggableWidget
                    id="balance-stat"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('balance-stat')}
                    label="Saldo do Mês"
                    onToggleVisibility={() => toggleWidgetVisibility('balance-stat')}
                    order={getWidgetOrder('balance-stat')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Saldo do Mês</p>
                  <PercentageIndicator value={monthlyComparison.balanceChange} />
                </div>
                <p className={`text-lg sm:text-xl font-bold truncate ${
                  projection.currentMonthBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(projection.currentMonthBalance)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </DraggableWidget>
                )}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fixed Expenses List */}
                {(isEditMode || isWidgetVisible('fixed-expenses-list')) && (
                  <DraggableWidget
                    id="fixed-expenses-list"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('fixed-expenses-list')}
                    label="Lista de Gastos Fixos"
                    onToggleVisibility={() => toggleWidgetVisibility('fixed-expenses-list')}
                    order={getWidgetOrder('fixed-expenses-list')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Gastos Fixos Confirmados
              </h2>
              <Link href="/transactions/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {projection.confirmedRecurringExpenses.length > 0 ? (
              <div className="space-y-2">
                {projection.confirmedRecurringExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {expense.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${expense.category_color}20`,
                            color: expense.category_color,
                          }}
                        >
                          {expense.category_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Dia {expense.expected_day}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex-shrink-0">
                      {formatCurrency(expense.expected_amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Nenhum gasto fixo configurado
                </p>
                <Link href="/transactions/settings">
                  <Button size="sm" variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Detectar Gastos
                  </Button>
                </Link>
              </div>
                  )}
                    </div>
                  </DraggableWidget>
                )}

                {/* Variable Expenses by Category */}
                {(isEditMode || isWidgetVisible('variable-expenses-chart')) && (
                  <DraggableWidget
                    id="variable-expenses-chart"
                    isEditMode={isEditMode}
                    isVisible={isWidgetVisible('variable-expenses-chart')}
                    label="Gastos por Categoria"
                    onToggleVisibility={() => toggleWidgetVisibility('variable-expenses-chart')}
                    order={getWidgetOrder('variable-expenses-chart')}
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Gastos Variáveis por Categoria
            </h2>

            {projection.variableExpensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {projection.variableExpensesByCategory.slice(0, 6).map((category) => (
                  <div key={category.category_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {/* Bolinha colorida da categoria */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.category_color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.category_name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(category.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: category.category_color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                        {category.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Adicione transações para ver análise de gastos variáveis
                </p>
              </div>
                  )}
                    </div>
                  </DraggableWidget>
                )}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </DashboardLayout>
  )
}
