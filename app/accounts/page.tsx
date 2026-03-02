'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Plus, Wallet, CreditCard, PiggyBank, TrendingUp, MoreHorizontal, Edit2, Trash2, Loader2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { CreateAccountModal } from '@/components/accounts/CreateAccountModal'
import { EditAccountModal } from '@/components/accounts/EditAccountModal'
import { DeleteAccountDialog } from '@/components/accounts/DeleteAccountDialog'
import { TransferModal } from '@/components/accounts/TransferModal'

interface BankAccount {
  id: string
  user_id: string
  name: string
  bank_name: string | null
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'other'
  balance: number
  currency: string
  color: string
  icon: string
  is_active: boolean
  is_default: boolean
  created_at: string
}

const ACCOUNT_TYPE_LABELS = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit: 'Cartão de Crédito',
  investment: 'Investimentos',
  other: 'Outros'
}

const ACCOUNT_TYPE_ICONS = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  other: MoreHorizontal
}

export default function AccountsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const fetchAccounts = async () => {
    try {
      setLoading(true)

      console.log('🔍 Iniciando busca de contas...')
      console.log('👤 Usuário:', user?.id, user?.email)

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      console.log('📊 Resposta do Supabase:', {
        hasData: !!data,
        dataLength: data?.length,
        hasError: !!error,
        error: error ? JSON.stringify(error, null, 2) : null
      })

      if (error) {
        console.error('❌ Erro do Supabase:', error)
        console.error('❌ Erro stringificado:', JSON.stringify(error))
        console.error('❌ Tipo do erro:', typeof error)
        console.error('❌ Keys do erro:', Object.keys(error))
        throw error
      }

      console.log('✅ Contas carregadas:', data)
      setAccounts(data || [])
    } catch (error: any) {
      console.error('💥 Erro capturado:', error)
      console.error('💥 Stack:', error?.stack)
      const errorMessage = error?.message || 'Erro desconhecido ao carregar contas'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchAccounts()

    // Realtime subscription
    const channel = supabase
      .channel('bank_accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        () => {
          console.log('🔄 Realtime: Mudança detectada, recarregando...')
          fetchAccounts()
        }
      )
      .subscribe()

    return () => {
      console.log('🧹 Limpando subscription...')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const totalBalance = accounts
    .filter(acc => acc.is_active && acc.account_type !== 'credit')
    .reduce((sum, acc) => sum + Number(acc.balance), 0)

  const activeAccounts = accounts.filter(acc => acc.is_active)
  const inactiveAccounts = accounts.filter(acc => !acc.is_active)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-[#8B7355] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Contas Bancárias
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie suas contas e acompanhe seus saldos
          </p>
        </div>

        {/* Saldo Total */}
        <div className="bg-gradient-to-br from-[#8B7355] to-[#6A5844] rounded-xl p-6 mb-6 text-white">
          <p className="text-sm opacity-90 mb-2">Saldo Total</p>
          <p className="text-3xl sm:text-4xl font-bold mb-4">
            {formatCurrency(totalBalance)}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
            <Button
              onClick={() => setShowTransferModal(true)}
              disabled={activeAccounts.length < 2}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          </div>
        </div>

        {/* Lista de Contas Ativas */}
        {activeAccounts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Contas Ativas ({activeAccounts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAccounts.map((account) => {
                const Icon = ACCOUNT_TYPE_ICONS[account.account_type]
                return (
                  <AccountCard
                    key={account.id}
                    account={account}
                    icon={Icon}
                    onEdit={setEditingAccount}
                    onDelete={setDeletingAccount}
                    formatCurrency={formatCurrency}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Lista de Contas Inativas */}
        {inactiveAccounts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
              Contas Inativas ({inactiveAccounts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {inactiveAccounts.map((account) => {
                const Icon = ACCOUNT_TYPE_ICONS[account.account_type]
                return (
                  <AccountCard
                    key={account.id}
                    account={account}
                    icon={Icon}
                    onEdit={setEditingAccount}
                    onDelete={setDeletingAccount}
                    formatCurrency={formatCurrency}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhuma conta cadastrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Comece criando sua primeira conta bancária
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#8B7355] hover:bg-[#7A6347]">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Conta
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchAccounts}
      />

      <EditAccountModal
        isOpen={!!editingAccount}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSuccess={fetchAccounts}
      />

      <DeleteAccountDialog
        isOpen={!!deletingAccount}
        account={deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onSuccess={fetchAccounts}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={fetchAccounts}
        accounts={activeAccounts}
      />
    </DashboardLayout>
  )
}

interface AccountCardProps {
  account: BankAccount
  icon: React.ComponentType<{ className?: string }>
  onEdit: (account: BankAccount) => void
  onDelete: (account: BankAccount) => void
  formatCurrency: (value: number) => string
}

function AccountCard({ account, icon: Icon, onEdit, onDelete, formatCurrency }: AccountCardProps) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${account.color}20` }}
        >
          <Icon className="h-6 w-6" style={{ color: account.color }} />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(account)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(account)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {account.name}
      </h3>

      {account.bank_name && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {account.bank_name}
        </p>
      )}

      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {formatCurrency(Number(account.balance))}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {ACCOUNT_TYPE_LABELS[account.account_type]}
        </span>
        {account.is_default && (
          <span className="text-xs bg-[#8B7355] text-white px-2 py-1 rounded-full">
            Padrão
          </span>
        )}
      </div>
    </div>
  )
}
