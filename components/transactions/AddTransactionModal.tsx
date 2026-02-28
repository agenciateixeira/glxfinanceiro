'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Portal } from '@/components/ui/portal'
import { X, DollarSign, Calendar } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
}

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      // Previne scroll no body quando modal aberto
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, type])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user?.id},is_system.eq.true`)
      .eq('type', type)
      .order('name')

    if (data) {
      setCategories(data)
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        description,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || null,
        date,
        payment_method: paymentMethod,
        notes: notes || null,
        status: 'completed',
      })

      if (error) throw error

      // Reset form
      setDescription('')
      setAmount('')
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao criar transação:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredCategories = categories.filter(c => c.type === type)

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
              Nova Transação
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
                onClick={() => {
                  setType('expense')
                  setCategoryId('')
                }}
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
                onClick={() => {
                  setType('income')
                  setCategoryId('')
                }}
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
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
