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
import { ImportReviewModal } from '@/components/transactions/ImportReviewModal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Toast } from '@/components/ui/toast'
import { Plus, Upload, Filter, Search, Download } from 'lucide-react'

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
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isImportPDFModalOpen, setIsImportPDFModalOpen] = useState(false)
  const [isImportReviewModalOpen, setIsImportReviewModalOpen] = useState(false)
  const [importedTransactions, setImportedTransactions] = useState<any[]>([])
  const [importBankName, setImportBankName] = useState<string | undefined>()
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
    }
  }, [user])

  const showToast = (title: string, variant: 'success' | 'error' | 'info', description?: string) => {
    setToast({ isOpen: true, title, description, variant })
  }

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('recent_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(100)

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

  const handleImportSuccess = (data: any) => {
    setImportedTransactions(data.transactions)
    setImportBankName(data.metadata?.bankName)
    setIsImportReviewModalOpen(true)

    // Mostra informações sobre o que foi processado
    if (data.metadata?.newCategoriesCreated?.length > 0) {
      showToast(
        `${data.metadata.newCategoriesCreated.length} nova(s) categoria(s) criada(s)`,
        'info',
        data.metadata.newCategoriesCreated.join(', ')
      )
    }
  }

  const handleConfirmImport = async (transactions: any[]) => {
    try {
      // Insere transações no banco
      const { error } = await supabase.from('transactions').insert(
        transactions.map((t) => ({
          user_id: user?.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category_id: t.suggested_category_id,
          date: t.date,
          payment_method: 'other',
          status: 'completed'
        }))
      )

      if (error) throw error

      showToast(
        `${transactions.length} transação(ões) importada(s) com sucesso`,
        'success',
        'As transações foram adicionadas à sua lista'
      )

      fetchTransactions()
      setIsImportReviewModalOpen(false)
      setImportedTransactions([])
    } catch (error) {
      console.error('Error importing transactions:', error)
      showToast('Erro ao importar transações', 'error')
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || t.type === filterType
    return matchesSearch && matchesType
  })

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receitas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Despesas</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a] mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
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

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-[#D4C5B9] text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'expense'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Despesas
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gray-200 dark:border-[#2a2a2a]"
                onClick={() => setIsImportPDFModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button
                className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova
              </Button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-[#D4C5B9] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando transações...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Comece adicionando sua primeira transação ou importe um extrato
              </p>
              <div className="flex gap-3 justify-center">
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#2a2a2a]/50 border-b border-gray-200 dark:border-[#2a2a2a]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Categoria
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
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      onClick={() => handleRowClick(transaction)}
                      className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
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
        />

        {/* Import Review Modal */}
        <ImportReviewModal
          isOpen={isImportReviewModalOpen}
          onClose={() => {
            setIsImportReviewModalOpen(false)
            setImportedTransactions([])
          }}
          transactions={importedTransactions}
          onConfirm={handleConfirmImport}
          bankName={importBankName}
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
      </div>
    </DashboardLayout>
  )
}
