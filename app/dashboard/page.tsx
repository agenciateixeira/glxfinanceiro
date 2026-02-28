'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visão geral das suas finanças
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Saldo Total */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg dark:hover:shadow-black/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                +0%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Saldo Total</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">R$ 0,00</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Todas as contas</p>
          </div>

          {/* Card 2 - Despesas */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg dark:hover:shadow-black/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-full">
                Este mês
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Despesas</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">R$ 0,00</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">0 transações</p>
          </div>

          {/* Card 3 - Receitas */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg dark:hover:shadow-black/50 transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full">
                Este mês
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Receitas</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">R$ 0,00</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">0 entradas</p>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-12 border border-gray-200 dark:border-[#2a2a2a] text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-[#D4C5B9] to-[#B4A5A5] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Em breve</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Estamos trabalhando para trazer todas as funcionalidades incríveis do GLX.
              Em breve você poderá gerenciar suas finanças de forma inteligente!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-xl">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transações</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Controle completo de gastos</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Importação</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Upload de faturas em PDF</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Relatórios</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Análises e insights</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-xl">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Metas</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Planeje o futuro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
