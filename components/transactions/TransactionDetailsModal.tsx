'use client'

import { Portal } from '@/components/ui/portal'
import { X, Edit2, Trash2, Calendar, CreditCard, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface TransactionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onEdit: () => void
  onDelete: () => void
}

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  pix: 'PIX',
  bank_transfer: 'Transferência Bancária',
  other: 'Outro',
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Detalhes da Transação
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Valor */}
            <div className="text-center pb-4 border-b border-gray-200 dark:border-[#2a2a2a]">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {transaction.type === 'income' ? 'Receita' : 'Despesa'}
              </p>
              <p
                className={`text-4xl font-bold ${
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

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Descrição
              </label>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {transaction.description}
              </p>
            </div>

            {/* Categoria */}
            {transaction.category_name && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Categoria
                </label>
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: `${transaction.category_color}20`,
                    color: transaction.category_color,
                  }}
                >
                  {transaction.category_name}
                </span>
              </div>
            )}

            {/* Data */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Data
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {new Date(transaction.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Forma de Pagamento */}
            {transaction.payment_method && (
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Forma de Pagamento
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {paymentMethodLabels[transaction.payment_method] || transaction.payment_method}
                  </p>
                </div>
              </div>
            )}

            {/* Observações */}
            {transaction.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Observações
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-3">
                    {transaction.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-[#2a2a2a]">
            <Button
              onClick={onDelete}
              variant="outline"
              className="flex-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button
              onClick={onEdit}
              className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
