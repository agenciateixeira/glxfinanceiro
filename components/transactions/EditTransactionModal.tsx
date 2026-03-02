'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Portal } from '@/components/ui/portal'
import { X, Tag as TagIcon, Plus } from 'lucide-react'
import { detectPaymentMethod } from '@/lib/services/paymentMethodDetector'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
}

interface Tag {
  id: string
  name: string
  color: string
}

interface BankAccount {
  id: string
  name: string
  account_type: string
  balance: number
  is_active: boolean
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string | null
  bank_account_id?: string | null
  date: string
  payment_method: string | null
  notes: string | null
  status: 'pending' | 'completed' | 'cancelled'
  tags?: Tag[]
}

interface EditTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction: Transaction | null
}

export function EditTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: EditTransactionModalProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen && transaction) {
      setDescription(transaction.description)
      setAmount(transaction.amount.toString())
      setType(transaction.type)
      setCategoryId(transaction.category_id || '')
      setBankAccountId(transaction.bank_account_id || '')
      setDate(transaction.date)

      // Se não tem payment_method salvo, detecta automaticamente baseado na descrição
      if (!transaction.payment_method || transaction.payment_method === 'credit_card') {
        const detected = detectPaymentMethod(transaction.description)
        setPaymentMethod(detected)
      } else {
        setPaymentMethod(transaction.payment_method)
      }

      setNotes(transaction.notes || '')
      setSelectedTags(transaction.tags || [])

      fetchCategories(transaction.type)
      fetchBankAccounts()
      fetchTags()
      fetchTransactionTags()
    }
  }, [isOpen, transaction])

  const fetchCategories = async (categoryType: 'income' | 'expense') => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user?.id},is_system.eq.true`)
      .eq('type', categoryType)
      .order('name')

    if (data) {
      setCategories(data)
    }
  }

  const fetchBankAccounts = async () => {
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (data) {
      setBankAccounts(data)
    }
  }

  const fetchTags = async () => {
    // RLS policies handle user filtering including shared spouse accounts
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (data) {
      setAllTags(data)
    }
  }

  const fetchTransactionTags = async () => {
    if (!transaction) return

    const { data } = await supabase
      .from('transaction_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          color
        )
      `)
      .eq('transaction_id', transaction.id)

    if (data) {
      const tags = data.map(item => item.tags).filter(Boolean) as Tag[]
      setSelectedTags(tags)
    }
  }

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType)
    setCategoryId('')
    fetchCategories(newType)
  }

  const handleAddTag = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const { data: newTag, error } = await supabase
        .from('tags')
        .insert({
          user_id: user?.id,
          name: newTagName.trim(),
          color: '#6b7280'
        })
        .select()
        .single()

      if (error) throw error

      setAllTags([...allTags, newTag])
      setSelectedTags([...selectedTags, newTag])
      setNewTagName('')
      setShowTagInput(false)
    } catch (error) {
      console.error('Erro ao criar tag:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return

    setLoading(true)

    try {
      // Atualiza transação
      const { error } = await supabase
        .from('transactions')
        .update({
          description,
          amount: parseFloat(amount),
          type,
          category_id: categoryId || null,
          bank_account_id: bankAccountId || null,
          date,
          payment_method: paymentMethod,
          notes: notes || null,
        })
        .eq('id', transaction.id)

      if (error) throw error

      // Remove tags antigas
      await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transaction.id)

      // Adiciona tags novas
      if (selectedTags.length > 0) {
        await supabase
          .from('transaction_tags')
          .insert(
            selectedTags.map(tag => ({
              transaction_id: transaction.id,
              tag_id: tag.id
            }))
          )
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar transação:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !transaction) return null

  const availableTags = allTags.filter(tag => !selectedTags.find(t => t.id === tag.id))

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
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Editar Transação
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'expense'
                    ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                💸 Despesa
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'income'
                    ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                💰 Receita
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição *
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Almoço no restaurante"
                required
                className="h-11"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valor *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  R$
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="pl-12 h-11"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conta Bancária
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full h-11 px-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
              >
                <option value="">Sem conta vinculada</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} - R$ {Number(acc.balance).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <TagIcon className="h-4 w-4 inline mr-1" />
                Tags
              </label>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag.id)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Tag */}
              {!showTagInput && (
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 5).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                      style={{ color: tag.color }}
                    >
                      + {tag.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-600 dark:text-gray-400"
                  >
                    <Plus className="h-3 w-3" />
                    Nova tag
                  </button>
                </div>
              )}

              {/* New Tag Input */}
              {showTagInput && (
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da tag"
                    className="h-9"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={handleCreateTag}
                    className="h-9 px-3 bg-[#D4C5B9] hover:bg-[#C4B5A9]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTagInput(false)
                      setNewTagName('')
                    }}
                    className="h-9 px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-11 px-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
              >
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="bank_transfer">Transferência Bancária</option>
                <option value="other">Outro</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
