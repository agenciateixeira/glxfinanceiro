'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Portal } from '@/components/ui/portal'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  is_system: boolean
}

interface EditCategoryModalProps {
  isOpen: boolean
  category: Category | null
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

export function EditCategoryModal({ isOpen, category, onClose, onSuccess }: EditCategoryModalProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#8B7355')

  useEffect(() => {
    if (isOpen && category) {
      setName(category.name)
      setColor(category.color)
    }
  }, [isOpen, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category) return

    if (!name.trim()) {
      toast.error('Digite o nome da categoria')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: name.trim(),
          color
        })
        .eq('id', category.id)

      if (error) throw error

      toast.success('Categoria atualizada com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      toast.error('Erro ao atualizar categoria')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !category) return null

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
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Editar Categoria
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
            {/* Type (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <div className="px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg text-gray-600 dark:text-gray-400">
                {category.type === 'income' ? '💰 Receita' : '💸 Despesa'}
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
                onClick={onClose}
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
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
