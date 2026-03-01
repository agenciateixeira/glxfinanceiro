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
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  DollarSign,
  RefreshCw,
  Tag,
  Users,
  User,
} from 'lucide-react'

interface RecurringExpense {
  id: string
  description: string
  category_id: string | null
  expected_amount: number
  expected_day: number | null
  is_active: boolean
  auto_detected: boolean
  person: 'person1' | 'person2' | 'shared'
  created_at: string
  updated_at: string
  categories?: {
    name: string
    color: string
    icon: string
  }
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
}

interface FinancialSettings {
  person1_name: string
  person2_name: string
}

export default function RecurringExpensesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<FinancialSettings | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    category_id: '',
    expected_amount: '',
    expected_day: '',
    person: 'shared' as 'person1' | 'person2' | 'shared',
  })

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
      fetchExpenses()
      fetchCategories()
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('financial_settings')
        .select('person1_name, person2_name')
        .eq('user_id', user.id)
        .single()

      setSettings(data)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const fetchExpenses = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          categories (
            name,
            color,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('description', { ascending: true })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Erro ao carregar gastos fixos:', error)
      showToast('Erro ao carregar gastos fixos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const handleOpenModal = (expense?: RecurringExpense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        description: expense.description,
        category_id: expense.category_id || '',
        expected_amount: expense.expected_amount.toString(),
        expected_day: expense.expected_day?.toString() || '',
        person: expense.person || 'shared',
      })
    } else {
      setEditingExpense(null)
      setFormData({
        description: '',
        category_id: '',
        expected_amount: '',
        expected_day: '',
        person: 'shared',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        user_id: user?.id,
        description: formData.description,
        category_id: formData.category_id || null,
        expected_amount: parseFloat(formData.expected_amount),
        expected_day: formData.expected_day ? parseInt(formData.expected_day) : null,
        person: formData.person,
        auto_detected: false,
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('recurring_expenses')
          .update(dataToSave)
          .eq('id', editingExpense.id)

        if (error) throw error
        showToast('Gasto fixo atualizado com sucesso!', 'success')
      } else {
        const { error } = await supabase
          .from('recurring_expenses')
          .insert([dataToSave])

        if (error) throw error
        showToast('Gasto fixo criado com sucesso!', 'success')
      }

      handleCloseModal()
      fetchExpenses()
    } catch (error: any) {
      console.error('Erro ao salvar gasto fixo:', error)
      showToast('Erro ao salvar gasto fixo', 'error', error?.message || 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (expense: RecurringExpense) => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: !expense.is_active })
        .eq('id', expense.id)

      if (error) throw error

      showToast(
        expense.is_active ? 'Gasto fixo desativado' : 'Gasto fixo ativado',
        'success'
      )
      fetchExpenses()
    } catch (error) {
      console.error('Erro ao alternar status:', error)
      showToast('Erro ao alternar status', 'error')
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este gasto fixo?')) return

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      showToast('Gasto fixo excluído com sucesso!', 'success')
      fetchExpenses()
    } catch (error) {
      console.error('Erro ao excluir gasto fixo:', error)
      showToast('Erro ao excluir gasto fixo', 'error')
    }
  }

  const getPersonLabel = (person: 'person1' | 'person2' | 'shared') => {
    if (person === 'shared') return 'Compartilhado'
    if (person === 'person1') return settings?.person1_name || 'Pessoa 1'
    if (person === 'person2') return settings?.person2_name || 'Pessoa 2'
    return ''
  }

  const getPersonIcon = (person: 'person1' | 'person2' | 'shared') => {
    if (person === 'shared') return <Users className="h-3 w-3" />
    return <User className="h-3 w-3" />
  }

  const getPersonColor = (person: 'person1' | 'person2' | 'shared') => {
    if (person === 'shared') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    if (person === 'person1') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    if (person === 'person2') return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
    return ''
  }

  const getTotalMonthly = () => {
    return expenses
      .filter(e => e.is_active)
      .reduce((sum, e) => sum + e.expected_amount, 0)
  }

  const getTotalByPerson = (person: 'person1' | 'person2' | 'shared') => {
    return expenses
      .filter(e => e.is_active && e.person === person)
      .reduce((sum, e) => sum + e.expected_amount, 0)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <RefreshCw className="h-7 w-7 text-primary-600" />
              Gastos Fixos
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gerencie seus gastos mensais recorrentes
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Gasto</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Mensal</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotalMonthly())}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Compartilhado</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotalByPerson('shared'))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getPersonLabel('person1')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotalByPerson('person1'))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getPersonLabel('person2')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotalByPerson('person2'))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhum gasto fixo cadastrado
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Comece adicionando seus gastos mensais fixos como aluguel, internet, luz, etc.
            </p>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Gasto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expenses.map((expense) => {
              const category = expense.categories
              const isActive = expense.is_active

              return (
                <div
                  key={expense.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-5 border transition-all ${
                    isActive
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-200 dark:border-gray-700 opacity-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{
                        backgroundColor: category ? `${category.color}20` : '#e5e7eb',
                      }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {expense.description}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {category && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {category.name}
                          </span>
                        )}
                        {expense.expected_day && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Dia {expense.expected_day}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount and Person */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(expense.expected_amount)}
                      </p>
                      <p className="text-xs text-gray-500">por mês</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getPersonColor(expense.person)}`}>
                      {getPersonIcon(expense.person)}
                      {getPersonLabel(expense.person)}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {!isActive && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                        Inativo
                      </span>
                    )}
                    {expense.auto_detected && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                        Auto-detectado
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Button
                      onClick={() => handleOpenModal(expense)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleToggleActive(expense)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      {isActive ? (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDelete(expense.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingExpense ? 'Editar Gasto Fixo' : 'Novo Gasto Fixo'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição *
                </label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Aluguel, Internet, Netflix..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quem usa este gasto? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, person: 'person1' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.person === 'person1'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <User className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs font-medium truncate">{getPersonLabel('person1')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, person: 'person2' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.person === 'person2'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <User className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs font-medium truncate">{getPersonLabel('person2')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, person: 'shared' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.person === 'shared'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs font-medium">Compartilhado</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoria
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor Esperado *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.expected_amount}
                  onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dia do Vencimento (opcional)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.expected_day}
                  onChange={(e) => setFormData({ ...formData, expected_day: e.target.value })}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Dia do mês em que este gasto costuma ocorrer
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingExpense ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
