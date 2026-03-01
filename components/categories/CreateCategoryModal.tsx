'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Portal } from '@/components/ui/portal'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const COLOR_OPTIONS = [
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Âmbar', value: '#f59e0b' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Lima', value: '#84cc16' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Esmeralda', value: '#059669' },
  { name: 'Azul Claro', value: '#06b6d4' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Marrom', value: '#8B7355' },
  { name: 'Cinza', value: '#6b7280' },
]

export function CreateCategoryModal({ isOpen, onClose, onSuccess }: CreateCategoryModalProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [color, setColor] = useState('#8B7355')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Digite o nome da categoria')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user?.id,
          name: name.trim(),
          type,
          color,
          icon: type === 'income' ? 'TrendingUp' : 'TrendingDown',
          is_system: false
        })

      if (error) throw error

      toast.success('Categoria criada com sucesso!')
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      toast.error('Erro ao criar categoria')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setType('expense')
    setColor('#8B7355')
    onClose()
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={handleClose}
        />

        {/* Modal */}
        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Nova Categoria
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo *
              </label>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
                <button
                  type="button"
                  onClick={() => setType('expense')}
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
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    type === 'income'
                      ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  💰 Receita
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alimentação, Salário, Freelance..."
                required
                className="h-11"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cor
              </label>
              <div className="grid grid-cols-7 gap-2">
                {COLOR_OPTIONS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                      color === colorOption.value
                        ? 'ring-2 ring-offset-2 ring-[#8B7355] dark:ring-offset-[#1a1a1a]'
                        : ''
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visualização
              </label>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: `${color}20`,
                  color: color
                }}
              >
                {name || 'Nome da categoria'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#8B7355] hover:bg-[#7A6347] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Categoria'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
