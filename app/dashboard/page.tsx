'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import {
  calculateFinancialProjection,
  formatCurrency,
  getProjectionColor,
  getProjectionMessage,
  type FinancialProjection,
} from '@/lib/services/financialProjection'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user } = useAuth()
  const [projection, setProjection] = useState<FinancialProjection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadProjection()
    }
  }, [user])

  const loadProjection = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const data = await calculateFinancialProjection(user.id)
      setProjection(data)
    } catch (error) {
      console.error('Erro ao carregar projeção:', error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Projeção financeira dos próximos 30 dias
          </p>
        </div>

        {/* Projection Alert */}
        <div className={`mb-6 rounded-xl p-4 sm:p-6 border ${projectionColors.bg} ${projectionColors.border}`}>
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

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Income */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Receita Mensal</p>
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

          {/* Fixed Expenses */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Gastos Fixos</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(projection.totalFixedExpenses)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {projection.confirmedRecurringExpenses.length} gastos recorrentes
            </p>
          </div>

          {/* Variable Expenses */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Gastos Variáveis</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(projection.averageVariableExpenses)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Média últimos 3 meses
            </p>
          </div>

          {/* Current Month */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Saldo do Mês</p>
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
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fixed Expenses List */}
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

          {/* Variable Expenses by Category */}
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
                        <span className="text-lg">{category.category_icon}</span>
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
        </div>
      </div>
    </DashboardLayout>
  )
}
