'use client'

import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PerformanceCardProps {
  patrimonyGrowth: number
  cdiRate: number
  ipcaRate: number
  month: string
}

export function PerformanceCard({ patrimonyGrowth, cdiRate, ipcaRate, month }: PerformanceCardProps) {
  const vsCDI = patrimonyGrowth - cdiRate
  const vsIPCA = patrimonyGrowth - ipcaRate
  const realGrowth = patrimonyGrowth - ipcaRate

  const isBeatingCDI = vsCDI > 0
  const isBeatingInflation = vsIPCA > 0

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Performance vs Benchmarks
        </h3>
        <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Referência: {month}
      </div>

      {/* Crescimento do Patrimônio */}
      <div className="mb-6 pb-6 border-b border-gray-200 dark:border-[#2a2a2a]">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Crescimento do Patrimônio
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {patrimonyGrowth > 0 ? '+' : ''}{patrimonyGrowth.toFixed(2)}%
        </div>
      </div>

      {/* Comparações */}
      <div className="space-y-4">
        {/* vs CDI */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-[#2a2a2a]">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              vs CDI ({cdiRate.toFixed(2)}%)
            </div>
            <div className={`text-sm ${isBeatingCDI ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isBeatingCDI ? '+' : ''}{vsCDI.toFixed(2)}% {isBeatingCDI ? 'acima' : 'abaixo'}
            </div>
          </div>
          <div>
            {isBeatingCDI ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/30">
                <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
            )}
          </div>
        </div>

        {/* vs IPCA */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-[#2a2a2a]">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              vs Inflação ({ipcaRate.toFixed(2)}%)
            </div>
            <div className={`text-sm ${isBeatingInflation ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isBeatingInflation ? '+' : ''}{vsIPCA.toFixed(2)}% {isBeatingInflation ? 'acima' : 'abaixo'}
            </div>
          </div>
          <div>
            {isBeatingInflation ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/30">
                <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
            )}
          </div>
        </div>

        {/* Crescimento Real */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-[#8B7355]/10 to-[#D4C5B9]/10 border border-[#8B7355]/20">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Crescimento Real (descontando inflação)
          </div>
          <div className={`text-2xl font-bold ${realGrowth > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {realGrowth > 0 ? '+' : ''}{realGrowth.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {realGrowth > 0
              ? 'Seu patrimônio está crescendo de verdade! 🎯'
              : 'Atenção: A inflação está corroendo seu patrimônio ⚠️'
            }
          </div>
        </div>
      </div>

      {/* Mensagem motivacional */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#2a2a2a]">
        {isBeatingCDI && isBeatingInflation ? (
          <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            ✅ Parabéns! Você está acima do CDI e da inflação!
          </div>
        ) : !isBeatingCDI && isBeatingInflation ? (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
            ⚠️ Você está protegido da inflação, mas pode melhorar vs CDI
          </div>
        ) : isBeatingCDI && !isBeatingInflation ? (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
            ⚠️ Bom desempenho vs CDI, mas cuidado com a inflação!
          </div>
        ) : (
          <div className="text-sm text-rose-600 dark:text-rose-400 font-medium">
            🚨 Atenção! Seu patrimônio está perdendo para o CDI e inflação
          </div>
        )}
      </div>
    </div>
  )
}
