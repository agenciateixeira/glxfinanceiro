'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { X, Check, AlertCircle, Sparkles, Edit2 } from 'lucide-react'
import { saveCategoryMapping } from '@/lib/services/categorization'

interface Category {
  id: string
  name: string
  color: string
  type: 'income' | 'expense'
}

interface ImportedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  suggested_category_id: string | null
  confidence: number
  matched_keywords: string[]
}

interface ImportReviewModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: ImportedTransaction[]
  onConfirm: (transactions: ImportedTransaction[]) => Promise<void>
  bankName?: string
}

export function ImportReviewModal({
  isOpen,
  onClose,
  transactions,
  onConfirm,
  bankName
}: ImportReviewModalProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [editedTransactions, setEditedTransactions] = useState<ImportedTransaction[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setEditedTransactions(transactions)
      // Seleciona todas por padrão
      setSelectedIndices(new Set(transactions.map((_, i) => i)))
      fetchCategories()
    }
  }, [isOpen, transactions])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user?.id},is_system.eq.true`)
      .order('name')

    if (data) {
      setCategories(data)
    }
  }

  const handleToggleTransaction = (index: number) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  const handleCategoryChange = (index: number, categoryId: string) => {
    const updated = [...editedTransactions]
    updated[index] = {
      ...updated[index],
      suggested_category_id: categoryId || null
    }
    setEditedTransactions(updated)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // Filtra apenas as transações selecionadas
      const selectedTransactions = editedTransactions.filter((_, i) =>
        selectedIndices.has(i)
      )

      // Salva mapeamentos de categorização para aprendizado
      for (const transaction of selectedTransactions) {
        if (transaction.suggested_category_id && user) {
          await saveCategoryMapping(
            user.id,
            transaction.description,
            transaction.suggested_category_id
          )
        }
      }

      await onConfirm(selectedTransactions)
      onClose()
    } catch (error) {
      console.error('Error confirming import:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIndices.size === editedTransactions.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(editedTransactions.map((_, i) => i)))
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-emerald-600 dark:text-emerald-400'
    if (confidence >= 0.4) return 'text-amber-600 dark:text-amber-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'Alta confiança'
    if (confidence >= 0.4) return 'Média confiança'
    return 'Baixa confiança'
  }

  if (!isOpen) return null

  const selectedCount = selectedIndices.size
  const totalIncome = editedTransactions
    .filter((t, i) => selectedIndices.has(i) && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = editedTransactions
    .filter((t, i) => selectedIndices.has(i) && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

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
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Revisar Transações Importadas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {bankName && `${bankName} • `}
                {editedTransactions.length} transação(ões) encontrada(s)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Selecionadas</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedCount} de {editedTransactions.length}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Receitas</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-3">
              <p className="text-xs text-rose-600 dark:text-rose-400 mb-1">Despesas</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-[#2a2a2a]">
              <input
                type="checkbox"
                checked={selectedIndices.size === editedTransactions.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-[#3a3a3a] text-[#D4C5B9] focus:ring-[#D4C5B9]"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selecionar todas
              </span>
            </div>

            {editedTransactions.map((transaction, index) => {
              const category = categories.find(c => c.id === transaction.suggested_category_id)
              const isSelected = selectedIndices.has(index)

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected
                      ? 'border-[#D4C5B9] bg-[#D4C5B9]/5'
                      : 'border-gray-200 dark:border-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTransaction(index)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-[#3a3a3a] text-[#D4C5B9] focus:ring-[#D4C5B9]"
                    />

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {transaction.description}
                            </p>
                            {transaction.confidence > 0 && (
                              <div className="flex items-center gap-1">
                                <Sparkles className={`h-3.5 w-3.5 ${getConfidenceColor(transaction.confidence)}`} />
                                <span className={`text-xs ${getConfidenceColor(transaction.confidence)}`}>
                                  {getConfidenceLabel(transaction.confidence)}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'} R${' '}
                            {transaction.amount.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2
                            })}
                          </p>
                          <span className={`text-xs ${
                            transaction.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </div>
                      </div>

                      {/* Category Selection */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px]">
                          Categoria:
                        </label>
                        <select
                          value={transaction.suggested_category_id || ''}
                          onChange={(e) => handleCategoryChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
                        >
                          <option value="">Sem categoria</option>
                          {categories
                            .filter(c => c.type === transaction.type)
                            .map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                        {category && (
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>

                      {/* Matched Keywords */}
                      {transaction.matched_keywords.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">
                            Palavras-chave: {transaction.matched_keywords.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount === 0
                ? 'Nenhuma transação selecionada'
                : `${selectedCount} transação(ões) será(ão) importada(s)`}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || selectedCount === 0}
                className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                {loading ? 'Importando...' : `Importar ${selectedCount} Transação(ões)`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
