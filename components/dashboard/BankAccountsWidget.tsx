'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BankAccount {
  id: string
  name: string
  account_type: string
  balance: number
  color: string
  icon: string
  is_active: boolean
  bank_name: string | null
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit: 'Cartão de Crédito',
  investment: 'Investimentos',
  other: 'Outros'
}

export function BankAccountsWidget() {
  const { user } = useAuth()
  const supabase = createClient()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalances, setShowBalances] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAccounts()

      // Realtime subscription
      const channel = supabase
        .channel('bank_accounts-widget')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        }, () => {
          fetchAccounts()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name')

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcula saldo total (não inclui cartões de crédito no positivo)
  const totalBalance = accounts
    .filter(acc => acc.account_type !== 'credit')
    .reduce((sum, acc) => sum + Number(acc.balance), 0)

  // Total de crédito usado
  const totalCredit = accounts
    .filter(acc => acc.account_type === 'credit')
    .reduce((sum, acc) => sum + Math.abs(Number(acc.balance)), 0)

  // Patrimônio líquido (inclui crédito como dívida)
  const netWorth = accounts.reduce((sum, acc) => {
    if (acc.account_type === 'credit') {
      return sum - Math.abs(Number(acc.balance))
    }
    return sum + Number(acc.balance)
  }, 0)

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-[#2a2a2a] rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 dark:bg-[#2a2a2a] rounded"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 dark:bg-[#2a2a2a] rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4C5B9] to-[#B4A5A5] flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Contas Bancárias</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{accounts.length} conta(s) ativa(s)</p>
          </div>
        </div>
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
        >
          {showBalances ? (
            <Eye className="h-4 w-4 text-gray-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Total Balance */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Saldo Total</span>
          </div>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            {showBalances ? `R$ ${totalBalance.toFixed(2)}` : '••••••'}
          </p>
        </div>

        {/* Net Worth */}
        <div className={`p-4 rounded-lg border ${
          netWorth >= 0
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {netWorth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-xs font-medium ${
              netWorth >= 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              Patrimônio
            </span>
          </div>
          <p className={`text-lg font-bold ${
            netWorth >= 0
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {showBalances ? `R$ ${netWorth.toFixed(2)}` : '••••••'}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-2 mb-4">
        {accounts.slice(0, 3).map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${account.color}20` }}
              >
                <span className="text-lg">{account.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {account.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold text-sm ${
                account.account_type === 'credit'
                  ? 'text-red-600 dark:text-red-400'
                  : Number(account.balance) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {showBalances
                  ? `R$ ${Number(account.balance).toFixed(2)}`
                  : '••••••'
                }
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Credit Card Info */}
      {totalCredit > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Crédito Usado</span>
            </div>
            <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
              {showBalances ? `R$ ${totalCredit.toFixed(2)}` : '••••••'}
            </p>
          </div>
        </div>
      )}

      {/* View All Link */}
      <Link
        href="/accounts"
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#3a3a3a] transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Ver todas as contas
        <ChevronRight className="h-4 w-4" />
      </Link>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Nenhuma conta bancária cadastrada
          </p>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white text-sm font-medium transition-colors"
          >
            Adicionar Conta
          </Link>
        </div>
      )}
    </div>
  )
}
