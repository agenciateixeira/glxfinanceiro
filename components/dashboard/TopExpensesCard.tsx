'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'

interface Expense {
  id: string
  description: string
  amount: number
  category_name: string
  category_color: string
  category_icon: string
  date: string
}

interface TopExpensesCardProps {
  expenses: Expense[]
  totalExpenses: number
}

export function TopExpensesCard({ expenses, totalExpenses }: TopExpensesCardProps) {
  // Pegar top 10
  const top10 = expenses.slice(0, 10)

  // Calcular percentual de cada despesa
  const expensesWithPercent = top10.map(expense => ({
    ...expense,
    percent: (expense.amount / totalExpenses) * 100
  }))

  // Somar o total das top 10
  const top10Total = top10.reduce((sum, exp) => sum + exp.amount, 0)
  const top10Percent = (top10Total / totalExpenses) * 100

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Top 10 Maiores Despesas
        </h3>
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      </div>

      {/* Resumo */}
      <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
        <div className="text-sm text-yellow-800 dark:text-yellow-200 mb-1">
          As top 10 representam
        </div>
        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
          {top10Percent.toFixed(1)}% do total
        </div>
        <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          R$ {top10Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Lista de despesas */}
      <div className="space-y-3">
        {expensesWithPercent.map((expense, index) => (
          <div
            key={expense.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            {/* Posição */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                {index + 1}
              </span>
            </div>

            {/* Ícone da categoria */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{
                backgroundColor: `${expense.category_color}20`,
                color: expense.category_color
              }}
            >
              {expense.category_icon}
            </div>

            {/* Informações */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {expense.description}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {expense.category_name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(expense.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Valor e percentual */}
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {expense.percent.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta se top 3 concentra muito */}
      {expensesWithPercent.length >= 3 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#2a2a2a]">
          {(() => {
            const top3Total = expensesWithPercent.slice(0, 3).reduce((sum, exp) => sum + exp.amount, 0)
            const top3Percent = (top3Total / totalExpenses) * 100

            if (top3Percent > 50) {
              return (
                <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Atenção:</span> As 3 maiores despesas representam {top3Percent.toFixed(1)}% do total. Considere revisar esses gastos.
                  </div>
                </div>
              )
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}
