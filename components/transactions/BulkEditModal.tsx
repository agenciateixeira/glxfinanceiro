'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedIds: string[]
  categories: any[]
  tags: any[]
  accounts: any[]
}

export function BulkEditModal({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
  categories,
  tags,
  accounts
}: BulkEditModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'category' | 'account' | 'status' | 'tags'>('category')

  // Estados para cada tipo de ação
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'completed' | 'cancelled'>('completed')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagAction, setTagAction] = useState<'add' | 'remove' | 'replace'>('add')

  useEffect(() => {
    if (!isOpen) {
      // Reset ao fechar
      setAction('category')
      setSelectedCategory('')
      setSelectedAccount('')
      setSelectedStatus('completed')
      setSelectedTags([])
      setTagAction('add')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (action === 'category') {
        if (!selectedCategory) {
          alert('Selecione uma categoria')
          setLoading(false)
          return
        }

        const { error } = await supabase
          .from('transactions')
          .update({ category_id: selectedCategory })
          .in('id', selectedIds)

        if (error) throw error

      } else if (action === 'account') {
        if (!selectedAccount) {
          alert('Selecione uma conta')
          setLoading(false)
          return
        }

        const { error } = await supabase
          .from('transactions')
          .update({ bank_account_id: selectedAccount })
          .in('id', selectedIds)

        if (error) throw error

      } else if (action === 'status') {
        const { error } = await supabase
          .from('transactions')
          .update({ status: selectedStatus })
          .in('id', selectedIds)

        if (error) throw error

      } else if (action === 'tags') {
        if (selectedTags.length === 0) {
          alert('Selecione pelo menos uma tag')
          setLoading(false)
          return
        }

        if (tagAction === 'replace') {
          // Remover todas as tags existentes
          await supabase
            .from('transaction_tags')
            .delete()
            .in('transaction_id', selectedIds)
        } else if (tagAction === 'remove') {
          // Remover tags específicas
          await supabase
            .from('transaction_tags')
            .delete()
            .in('transaction_id', selectedIds)
            .in('tag_id', selectedTags)
        }

        if (tagAction === 'add' || tagAction === 'replace') {
          // Adicionar novas tags
          const tagsToInsert = selectedIds.flatMap(transactionId =>
            selectedTags.map(tagId => ({
              transaction_id: transactionId,
              tag_id: tagId
            }))
          )

          const { error } = await supabase
            .from('transaction_tags')
            .upsert(tagsToInsert, {
              onConflict: 'transaction_id,tag_id',
              ignoreDuplicates: true
            })

          if (error) throw error
        }
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro na edição em massa:', error)
      alert('Erro ao atualizar transações: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#2a2a2a]">
        <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#2a2a2a] p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Editar {selectedIds.length} {selectedIds.length === 1 ? 'Transação' : 'Transações'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seletor de Ação */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              O que deseja alterar?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('category')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  action === 'category'
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Categoria
              </button>
              <button
                type="button"
                onClick={() => setAction('account')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  action === 'account'
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Conta
              </button>
              <button
                type="button"
                onClick={() => setAction('status')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  action === 'status'
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Status
              </button>
              <button
                type="button"
                onClick={() => setAction('tags')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  action === 'tags'
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                Tags
              </button>
            </div>
          </div>

          {/* Categoria */}
          {action === 'category' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nova Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conta */}
          {action === 'account' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nova Conta Bancária
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.bank_name ? `- ${acc.bank_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          {action === 'status' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Novo Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'pending', label: 'Pendente' },
                  { value: 'completed', label: 'Concluída' },
                  { value: 'cancelled', label: 'Cancelada' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedStatus(option.value as any)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === option.value
                        ? 'bg-[#8B7355] text-white'
                        : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {action === 'tags' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ação com Tags
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'add', label: 'Adicionar' },
                    { value: 'remove', label: 'Remover' },
                    { value: 'replace', label: 'Substituir' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTagAction(option.value as any)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        tagAction === option.value
                          ? 'bg-[#8B7355] text-white'
                          : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selecione as Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTags.includes(tag.id)
                          ? 'bg-[#8B7355] text-white'
                          : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#8B7355] hover:bg-[#7A6347] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>Aplicar a {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
