'use client'

import Link from 'next/link'
import { Target, CheckCircle, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/services/financialProjection'
import type { GoalProgress } from '@/lib/services/financialInsights'

interface GoalProgressWidgetProps {
  goalProgress: GoalProgress | null
}

export function GoalProgressWidget({ goalProgress }: GoalProgressWidgetProps) {
  if (!goalProgress) return null

  return (
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
  )
}
