'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/services/financialProjection'
import {
  Plus,
  Target,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

interface Goal {
  id: string
  title: string
  description: string | null
  target_amount: number
  current_amount: number
  target_date: string
  status: 'active' | 'completed' | 'cancelled'
  color: string
  icon: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export default function GoalsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddValueModalOpen, setIsAddValueModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    target_date: '',
    icon: '🎯',
    color: '#D4C5B9',
  })

  const [valueToAdd, setValueToAdd] = useState('')

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

  const showToast = (title: string, variant: 'success' | 'error' | 'info', description?: string) => {
    setToast({ isOpen: true, title, description, variant })
  }

  useEffect(() => {
    if (user) {
      fetchGoals()
    }
  }, [user])

  const fetchGoals = async () => {
    try {
      // RLS policies handle user filtering including shared spouse accounts
      const { data, error} = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setGoals(data || [])
    } catch (error) {
      console.error('Erro ao buscar metas:', error)
      showToast('Erro ao carregar metas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        name: goal.title,
        description: goal.description || '',
        target_amount: goal.target_amount.toString(),
        target_date: goal.target_date,
        icon: goal.icon,
        color: goal.color,
      })
    } else {
      setEditingGoal(null)
      setFormData({
        name: '',
        description: '',
        target_amount: '',
        target_date: '',
        icon: '🎯',
        color: '#D4C5B9',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGoal(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        user_id: user?.id,
        title: formData.name,
        description: formData.description || null,
        target_amount: parseFloat(formData.target_amount),
        target_date: formData.target_date,
        icon: formData.icon,
        color: formData.color,
      }

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(dataToSave)
          .eq('id', editingGoal.id)

        if (error) throw error
        showToast('Meta atualizada com sucesso!', 'success')
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([dataToSave])

        if (error) throw error
        showToast('Meta criada com sucesso!', 'success')
      }

      handleCloseModal()
      fetchGoals()
    } catch (error: any) {
      console.error('Erro ao salvar meta:', error)

      // Verifica se a tabela não existe
      if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        showToast(
          'Tabela goals não encontrada',
          'error',
          'Execute o SQL lib/sql/goals.sql no Supabase primeiro'
        )
      } else {
        showToast('Erro ao salvar meta', 'error', error?.message || 'Erro desconhecido')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error

      showToast('Meta excluída com sucesso!', 'success')
      fetchGoals()
    } catch (error) {
      console.error('Erro ao excluir meta:', error)
      showToast('Erro ao excluir meta', 'error')
    }
  }

  const handleCompleteGoal = async (goal: Goal) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          status: 'completed',
          current_amount: goal.target_amount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', goal.id)

      if (error) throw error

      showToast('Parabéns! Meta concluída! 🎉', 'success')
      fetchGoals()
    } catch (error) {
      console.error('Erro ao completar meta:', error)
      showToast('Erro ao completar meta', 'error')
    }
  }

  const handleOpenAddValue = (goal: Goal) => {
    setSelectedGoal(goal)
    setValueToAdd('')
    setIsAddValueModalOpen(true)
  }

  const handleAddValue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoal) return

    setSaving(true)

    try {
      const newAmount = selectedGoal.current_amount + parseFloat(valueToAdd)
      const isCompleted = newAmount >= selectedGoal.target_amount

      const { error } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: isCompleted ? 'completed' : 'active',
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', selectedGoal.id)

      if (error) throw error

      showToast(
        isCompleted ? 'Parabéns! Meta concluída! 🎉' : 'Valor adicionado com sucesso!',
        'success'
      )
      setIsAddValueModalOpen(false)
      fetchGoals()
    } catch (error) {
      console.error('Erro ao adicionar valor:', error)
      showToast('Erro ao adicionar valor', 'error')
    } finally {
      setSaving(false)
    }
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const iconOptions = ['🎯', '💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎉', '⭐', '🌟']
  const colorOptions = ['#D4C5B9', '#84CC16', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444']

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[#D4C5B9] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando metas...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Metas Financeiras
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Defina e acompanhe seus objetivos financeiros
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        </div>

        {/* Goals Grid */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {goals.map((goal) => {
              const progress = getProgressPercentage(goal.current_amount, goal.target_amount)
              const daysRemaining = getDaysRemaining(goal.target_date)
              const isCompleted = goal.status === 'completed'

              return (
                <div
                  key={goal.id}
                  className={`bg-white dark:bg-[#1a1a1a] rounded-xl p-5 sm:p-6 border transition-all ${
                    isCompleted
                      ? 'border-emerald-200 dark:border-emerald-800'
                      : 'border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg dark:hover:shadow-black/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        {goal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {goal.title}
                        </h3>
                        {isCompleted && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Concluída
                          </span>
                        )}
                      </div>
                    </div>
                    {!isCompleted && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(goal)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(goal.current_amount)}
                      </span>
                      <span className="text-sm font-bold" style={{ color: goal.color }}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Meta: {formatCurrency(goal.target_amount)}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {daysRemaining > 0 ? (
                        <span>{daysRemaining} dias restantes</span>
                      ) : daysRemaining === 0 ? (
                        <span>Hoje é o dia!</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">Prazo vencido</span>
                      )}
                    </div>

                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddValue(goal)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                        {progress >= 100 && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteGoal(goal)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Empty State
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-12 border border-gray-200 dark:border-[#2a2a2a] text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-[#D4C5B9] to-[#C4B5A9] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Defina suas metas
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Crie metas financeiras para alcançar seus sonhos. Acompanhe o progresso e celebre suas conquistas!
              </p>
              <Button
                onClick={() => handleOpenModal()}
                className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] p-4 sm:p-6 border-b border-gray-200 dark:border-[#2a2a2a] z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Meta *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Viagem para Europa"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva sua meta..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4C5B9]"
                />
              </div>

              {/* Valor Alvo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor Alvo *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="10000.00"
                  required
                />
              </div>

              {/* Data Alvo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Alvo *
                </label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  required
                />
              </div>

              {/* Ícone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ícone
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-3 text-2xl border-2 rounded-lg transition-all ${
                        formData.icon === icon
                          ? 'border-[#D4C5B9] bg-[#D4C5B9]/10'
                          : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        formData.color === color
                          ? 'border-gray-900 dark:border-gray-100 scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                >
                  {saving ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Criar Meta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Value Modal */}
      {isAddValueModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md animate-in slide-in-from-bottom sm:zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Adicionar Valor
                </h2>
                <button
                  onClick={() => setIsAddValueModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddValue} className="p-4 sm:p-6 space-y-4">
              <div className="text-center mb-4">
                <div
                  className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl mb-3"
                  style={{ backgroundColor: `${selectedGoal.color}20` }}
                >
                  {selectedGoal.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {selectedGoal.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Atual: {formatCurrency(selectedGoal.current_amount)} de {formatCurrency(selectedGoal.target_amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor a Adicionar *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={valueToAdd}
                  onChange={(e) => setValueToAdd(e.target.value)}
                  placeholder="100.00"
                  required
                  autoFocus
                />
              </div>

              {valueToAdd && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Novo total: {formatCurrency(selectedGoal.current_amount + parseFloat(valueToAdd || '0'))}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddValueModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !valueToAdd}
                  className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                >
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </DashboardLayout>
  )
}
