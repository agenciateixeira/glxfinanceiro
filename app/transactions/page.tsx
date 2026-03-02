'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal'
import { TransactionDetailsModal } from '@/components/transactions/TransactionDetailsModal'
import { SimpleImportModal } from '@/components/transactions/SimpleImportModal'
import { BulkEditModal } from '@/components/transactions/BulkEditModal'
import { TransactionFilters, FilterState } from '@/components/transactions/TransactionFilters'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Toast } from '@/components/ui/toast'
import { Plus, Upload, Filter, Search, Download, Edit } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  status: 'pending' | 'completed' | 'cancelled'
  payment_method: string | null
  date: string
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  category_id: string | null
  notes: string | null
  tags: Tag[]
  bank_account_id: string | null
  account_id: string | null
  account_name: string | null
  account_bank_name: string | null
  account_type: string | null
  account_color: string | null
  account_icon: string | null
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsToShow, setItemsToShow] = useState(50)
  const [filters, setFilters] = useState<FilterState>({
    period: '30d',
    categoryIds: [],
    tagIds: [],
    type: 'all',
    accountId: undefined
  })
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isImportPDFModalOpen, setIsImportPDFModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Bulk edit state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{
    isOpen: boolean
    title: string
    description?: string
    variant: 'success' | 'error' | 'info'
  }>({
    isOpen: false,
    title: '',
    variant: 'success',
  })

  useEffect(() => {
    if (user) {
      fetchTransactions()
      fetchCategories()
      fetchTags()
      fetchAccounts()

      // Setup Realtime subscriptions
      // RLS policies handle user filtering including shared spouse accounts
      const transactionsChannel = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions'
          },
          () => {
            fetchTransactions()
          }
        )
        .subscribe()

      const categoriesChannel = supabase
        .channel('categories-changes-tx')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories'
          },
          () => {
            fetchCategories()
          }
        )
        .subscribe()

      // RLS policies handle user filtering including shared spouse accounts
      const tagsChannel = supabase
        .channel('tags-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tags'
          },
          () => {
            fetchTags()
          }
        )
        .subscribe()

      const accountsChannel = supabase
        .channel('accounts-changes-tx')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bank_accounts'
          },
          () => {
            fetchAccounts()
          }
        )
        .subscribe()

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(transactionsChannel)
        supabase.removeChannel(categoriesChannel)
        supabase.removeChannel(tagsChannel)
        supabase.removeChannel(accountsChannel)
      }
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [filters])

  const showToast = (title: string, variant: 'success' | 'error' | 'info', description?: string) => {
    setToast({ isOpen: true, title, description, variant })
  }

  const fetchCategories = async () => {
    try {
      // RLS policies handle user filtering including shared spouse accounts
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const fetchTags = async () => {
    try {
      // RLS policies handle user filtering including shared spouse accounts
      const { data, error} = await supabase
        .from('tags')
        .select('*')
        .order('name')

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Erro ao buscar tags:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      // RLS policies handle user filtering including shared spouse accounts
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
    }
  }

  const getDateFilter = () => {
    const now = new Date()
    const periodMap = {
      '7d': 7,
      '15d': 15,
      '30d': 30,
      '90d': 90
    }

    if (filters.period === 'all') {
      return null
    }

    if (filters.period === 'custom') {
      // Se tem data customizada, usa ela
      if (filters.customStartDate) {
        return filters.customStartDate
      }
      // Se não tem data customizada ainda, retorna null (mostra tudo)
      return null
    }

    const days = periodMap[filters.period as keyof typeof periodMap]
    if (!days) return null

    const date = new Date(now)
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  const fetchTransactions = async () => {
    try {
      // RLS policies handle user filtering including shared spouse accounts
      let query = supabase
        .from('recent_transactions')
        .select('*')

      // Filtro de período
      const dateFilter = getDateFilter()
      if (dateFilter) {
        query = query.gte('date', dateFilter)
      }

      // Filtro de data final (apenas para período customizado)
      if (filters.period === 'custom' && filters.customEndDate) {
        query = query.lte('date', filters.customEndDate)
      }

      // Filtro de tipo
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      // Filtro de categorias
      if (filters.categoryIds.length > 0) {
        query = query.in('category_id', filters.categoryIds)
      }

      // Filtro de conta bancária
      if (filters.accountId) {
        query = query.eq('bank_account_id', filters.accountId)
      }

      query = query.order('date', { ascending: false }).limit(500)

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
      showToast('Erro ao carregar transações', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsModalOpen(true)
  }

  const handleEdit = () => {
    setIsDetailsModalOpen(false)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = () => {
    setTransactionToDelete(selectedTransaction)
    setIsDetailsModalOpen(false)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return

    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id)

      if (error) throw error

      showToast('Transação excluída com sucesso', 'success')
      fetchTransactions()
      setIsDeleteDialogOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      console.error('Erro ao deletar transação:', error)
      showToast('Erro ao excluir transação', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSuccess = () => {
    fetchTransactions()
    showToast('Transação salva com sucesso', 'success')
  }

  const handleImportSuccess = () => {
    // Refresh transactions after successful import
    fetchTransactions()
    showToast('Transações importadas com sucesso', 'success')
  }

  // Filtra por busca de texto e tags (filtros de tipo e categoria já são aplicados na query)
  const filteredTransactions = transactions.filter(t => {
    // Filtro de busca
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro de tags
    const matchesTags = !filters.tagIds || filters.tagIds.length === 0 ||
      (t.tags && t.tags.some(tag => filters.tagIds?.includes(tag.id)))

    return matchesSearch && matchesTags
  })

  // Paginação
  const displayedTransactions = filteredTransactions.slice(0, itemsToShow)
  const hasMore = filteredTransactions.length > itemsToShow

  const handleLoadMore = () => {
    setItemsToShow(prev => prev + 50)
  }

  // Reset pagination when filters change
  useEffect(() => {
    setItemsToShow(50)
    setSelectedTransactionIds([]) // Limpar seleção ao mudar filtros
  }, [filters, searchTerm])

  // Handlers para seleção múltipla
  const handleSelectAll = () => {
    if (selectedTransactionIds.length === displayedTransactions.length) {
      setSelectedTransactionIds([])
    } else {
      setSelectedTransactionIds(displayedTransactions.map(t => t.id))
    }
  }

  const handleSelectTransaction = (id: string) => {
    setSelectedTransactionIds(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    )
  }

  const handleBulkEditSuccess = () => {
    fetchTransactions()
    setSelectedTransactionIds([])
    showToast(`${selectedTransactionIds.length} transação(ões) atualizada(s) com sucesso`, 'success')
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('Nenhuma transação para exportar', 'info')
      return
    }

    // Cabeçalhos do CSV
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Método de Pagamento', 'Status', 'Observações']

    // Converte transações para linhas CSV
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      `"${t.description.replace(/"/g, '""')}"`, // Escapa aspas
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category_name || 'Sem categoria',
      `"R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"`,
      t.payment_method === 'credit_card' ? 'Cartão de Crédito' :
      t.payment_method === 'debit_card' ? 'Cartão de Débito' :
      t.payment_method === 'cash' ? 'Dinheiro' :
      t.payment_method === 'pix' ? 'PIX' :
      t.payment_method === 'bank_transfer' ? 'Transferência' : 'Outro',
      t.status === 'completed' ? 'Concluída' :
      t.status === 'pending' ? 'Pendente' : 'Cancelada',
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : ''
    ])

    // Monta o CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Adiciona BOM para UTF-8 (ajuda Excel a reconhecer acentos)
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Cria link para download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const fileName = `transacoes_${new Date().toISOString().split('T')[0]}.csv`

    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast(`${filteredTransactions.length} transação(ões) exportada(s)`, 'success')
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Transações
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie suas receitas e despesas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">Receitas</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">Despesas</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 truncate">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">Saldo</p>
            <p className={`text-lg sm:text-2xl font-bold truncate ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTransactionIds.length > 0 && (
          <div className="bg-gradient-to-r from-[#8B7355] to-[#7A6347] rounded-xl p-4 mb-6 text-white shadow-lg animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  {selectedTransactionIds.length} selecionada{selectedTransactionIds.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => setSelectedTransactionIds([])}
                  className="text-xs underline hover:no-underline opacity-90 hover:opacity-100"
                >
                  Limpar seleção
                </button>
              </div>
              <Button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Selecionadas
              </Button>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a] mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search with Filter Icon */}
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
                />
              </div>
              {/* Filter Button */}
              <Button
                variant="outline"
                size="icon"
                className={`relative border-gray-200 dark:border-[#2a2a2a] ${
                  (filters.categoryIds.length > 0 || filters.type !== 'all' || filters.period !== '30d' || filters.accountId)
                    ? 'bg-[#D4C5B9]/10 border-[#D4C5B9]'
                    : ''
                }`}
                onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              >
                <Filter className="h-5 w-5" />
                {(filters.categoryIds.length > 0 || filters.type !== 'all' || filters.period !== '30d' || filters.accountId) && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#D4C5B9] text-white text-xs rounded-full flex items-center justify-center">
                    {filters.categoryIds.length + (filters.type !== 'all' ? 1 : 0) + (filters.period !== '30d' ? 1 : 0) + (filters.accountId ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gray-200 dark:border-[#2a2a2a]"
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                title="Exportar transações para CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Exportar</span>
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 dark:border-[#2a2a2a]"
                onClick={() => setIsImportPDFModalOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Importar</span>
              </Button>
              <Button
                className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Nova</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Drawer */}
        {isFilterDrawerOpen && (
          <div className="mb-6">
            <TransactionFilters
              categories={categories}
              tags={tags}
              accounts={accounts}
              onFilterChange={setFilters}
              currentFilters={filters}
              onClose={() => setIsFilterDrawerOpen(false)}
            />
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-[#D4C5B9] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando transações...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || filters.categoryIds.length > 0 || filters.type !== 'all'
                  ? 'Nenhuma transação encontrada'
                  : 'Juntos, construindo um futuro financeiro sólido'}
              </h3>

              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchTerm || filters.categoryIds.length > 0 || filters.type !== 'all'
                  ? 'Tente ajustar os filtros ou buscar por outros termos'
                  : 'Cada passo dado hoje é um investimento no amanhã que vocês sonham. Comece agora!'}
              </p>

              {!(searchTerm || filters.categoryIds.length > 0 || filters.type !== 'all') && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="border-gray-200 dark:border-[#2a2a2a]"
                    onClick={() => setIsImportPDFModalOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Extrato
                  </Button>
                  <Button
                    className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Transação
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#2a2a2a]/50 border-b border-gray-200 dark:border-[#2a2a2a]">
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={selectedTransactionIds.length === displayedTransactions.length && displayedTransactions.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-[#8B7355] focus:ring-[#8B7355] cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Conta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                    {displayedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.includes(transaction.id)}
                            onChange={() => handleSelectTransaction(transaction.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 text-[#8B7355] focus:ring-[#8B7355] cursor-pointer"
                          />
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {transaction.description}
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer"
                        >
                          {transaction.account_name ? (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${transaction.account_color}20`,
                                color: transaction.account_color,
                              }}
                            >
                              {transaction.account_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer"
                        >
                          {transaction.category_name ? (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${transaction.category_color}20`,
                                color: transaction.category_color,
                              }}
                            >
                              {transaction.category_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">Sem categoria</span>
                          )}
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 text-sm cursor-pointer"
                        >
                          {transaction.tags && transaction.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {transaction.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                          )}
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer"
                        >
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td
                          onClick={() => handleRowClick(transaction)}
                          className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium cursor-pointer"
                        >
                          <span
                            className={
                              transaction.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {transaction.type === 'income' ? '+' : '-'} R${' '}
                            {Number(transaction.amount).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                {displayedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => handleRowClick(transaction)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/30 transition-colors cursor-pointer active:bg-gray-100 dark:active:bg-[#2a2a2a]/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p
                          className={`text-sm font-semibold ${
                            transaction.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'} R${' '}
                          {Number(transaction.amount).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {transaction.account_name && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${transaction.account_color}20`,
                            color: transaction.account_color,
                          }}
                        >
                          {transaction.account_name}
                        </span>
                      )}
                      {transaction.category_name && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${transaction.category_color}20`,
                            color: transaction.category_color,
                          }}
                        >
                          {transaction.category_icon} {transaction.category_name}
                        </span>
                      )}
                      {transaction.tags && transaction.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Load More Button */}
          {hasMore && !loading && filteredTransactions.length > 0 && (
            <div className="p-6 border-t border-gray-200 dark:border-[#2a2a2a] flex flex-col items-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {displayedTransactions.length} de {filteredTransactions.length} transações
              </p>
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="border-gray-200 dark:border-[#2a2a2a]"
              >
                Carregar mais
              </Button>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        <TransactionDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />

        {/* Add Transaction Modal */}
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSuccess}
        />

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedTransaction(null)
          }}
          onSuccess={handleSuccess}
          transaction={selectedTransaction}
        />

        {/* Import Modal */}
        <SimpleImportModal
          isOpen={isImportPDFModalOpen}
          onClose={() => setIsImportPDFModalOpen(false)}
          onSuccess={handleImportSuccess}
          categories={categories}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false)
            setTransactionToDelete(null)
          }}
          onConfirm={handleDelete}
          title="Excluir Transação"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          loading={deleteLoading}
        />

        {/* Toast Notification */}
        <Toast
          isOpen={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
        />

        {/* Bulk Edit Modal */}
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          onSuccess={handleBulkEditSuccess}
          selectedIds={selectedTransactionIds}
          categories={categories}
          tags={tags}
          accounts={accounts}
        />
      </div>
    </DashboardLayout>
  )
}
