'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_system: boolean
}

interface DeleteCategoryDialogProps {
  isOpen: boolean
  category: Category | null
  onClose: () => void
  onSuccess: () => void
}

export function DeleteCategoryDialog({ isOpen, category, onClose, onSuccess }: DeleteCategoryDialogProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [checkingUsage, setCheckingUsage] = useState(false)
  const [transactionCount, setTransactionCount] = useState(0)

  useEffect(() => {
    if (isOpen && category) {
      checkCategoryUsage()
    }
  }, [isOpen, category])

  const checkCategoryUsage = async () => {
    if (!category) return

    setCheckingUsage(true)

    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id)

      if (error) throw error
      setTransactionCount(count || 0)
    } catch (error) {
      console.error('Erro ao verificar uso da categoria:', error)
    } finally {
      setCheckingUsage(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return

    // System categories cannot be deleted
    if (category.is_system) {
      toast.error('Categorias do sistema não podem ser excluídas')
      return
    }

    // Categories in use cannot be deleted
    if (transactionCount > 0) {
      toast.error(`Esta categoria está sendo usada em ${transactionCount} transação(ões)`)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      toast.success('Categoria excluída com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !category) return null

  const canDelete = !category.is_system && transactionCount === 0

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Dialog */}
        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Excluir Categoria
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {checkingUsage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-[#8B7355] animate-spin" />
              </div>
            ) : (
              <>
                {category.is_system ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Categorias do sistema não podem ser excluídas.</strong>
                      <br />
                      Elas são essenciais para o funcionamento do aplicativo.
                    </p>
                  </div>
                ) : transactionCount > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Esta categoria não pode ser excluída.</strong>
                      <br />
                      Ela está sendo usada em <strong>{transactionCount}</strong> transação(ões).
                      <br />
                      <br />
                      Para excluí-la, primeiro remova ou altere a categoria dessas transações.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300">
                      Tem certeza que deseja excluir a categoria{' '}
                      <strong className="text-gray-900 dark:text-gray-100">"{category.name}"</strong>?
                    </p>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Esta ação não pode ser desfeita.</strong>
                        <br />
                        A categoria será permanentemente removida.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-[#2a2a2a]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              {canDelete ? 'Cancelar' : 'Fechar'}
            </Button>
            {canDelete && (
              <Button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={loading || checkingUsage}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Categoria'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
