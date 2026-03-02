'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteAccountDialog({ isOpen, account, onClose, onSuccess }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [hasTransactions, setHasTransactions] = useState(false)

  useEffect(() => {
    if (isOpen && account) {
      checkTransactions()
    }
  }, [isOpen, account])

  const checkTransactions = async () => {
    if (!account) return

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_account_id', account.id)

    setHasTransactions((count || 0) > 0)
  }

  const handleDelete = async () => {
    if (!account) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', account.id)

      if (error) throw error
      toast.success('Conta excluída com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir conta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !account) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-red-600">Excluir Conta</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir a conta <strong>{account.name}</strong>?
          </p>

          {hasTransactions && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Esta conta possui transações associadas.
                Ao excluir a conta, as transações não serão excluídas, mas perderão a vinculação com a conta.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
