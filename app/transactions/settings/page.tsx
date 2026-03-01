'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toast } from '@/components/ui/toast'
import { Save, Users, DollarSign, Calendar, Percent, RefreshCw, Check, X, TrendingUp, Sparkles } from 'lucide-react'
import { detectRecurringExpenses, formatCurrency, type RecurringExpense } from '@/lib/services/recurringExpenseDetection'

interface FinancialSettings {
  id?: string
  person1_name: string
  person1_salary: string
  person1_payment_day: string
  person1_tax_rate: string
  person2_name: string
  person2_salary: string
  person2_payment_day: string
  person2_tax_rate: string
}

export default function FinancialSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<FinancialSettings>({
    person1_name: '',
    person1_salary: '',
    person1_payment_day: '',
    person1_tax_rate: '',
    person2_name: '',
    person2_salary: '',
    person2_payment_day: '',
    person2_tax_rate: '',
  })

  // Recurring expenses detection
  const [detectingExpenses, setDetectingExpenses] = useState(false)
  const [detectedExpenses, setDetectedExpenses] = useState<RecurringExpense[]>([])
  const [confirmedExpenses, setConfirmedExpenses] = useState<Set<string>>(new Set())

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
      fetchSettings()
      fetchConfirmedExpenses()
    }
  }, [user])

  const fetchConfirmedExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)

      if (error) throw error

      if (data) {
        setConfirmedExpenses(new Set(data.map(e => e.id)))
      }
    } catch (error) {
      console.error('Erro ao buscar gastos confirmados:', error)
    }
  }

  const handleDetectExpenses = async () => {
    if (!user?.id) return

    setDetectingExpenses(true)
    try {
      const expenses = await detectRecurringExpenses(user.id)
      setDetectedExpenses(expenses)

      if (expenses.length === 0) {
        showToast('Nenhum gasto recorrente detectado', 'info', 'Adicione mais transações para melhorar a detecção')
      } else {
        showToast(`${expenses.length} gastos recorrentes detectados!`, 'success')
      }
    } catch (error) {
      console.error('Erro ao detectar gastos:', error)
      showToast('Erro ao detectar gastos recorrentes', 'error')
    } finally {
      setDetectingExpenses(false)
    }
  }

  const handleConfirmExpense = async (expense: RecurringExpense) => {
    try {
      // Calcular dia esperado baseado na última ocorrência
      const lastDate = new Date(expense.last_occurrence)
      const expectedDay = lastDate.getDate()

      const { error } = await supabase
        .from('recurring_expenses')
        .insert([{
          user_id: user?.id,
          description: expense.description,
          category_id: expense.category_id,
          expected_amount: expense.average_amount,
          expected_day: expectedDay,
          is_active: true,
          auto_detected: true,
        }])

      if (error) throw error

      setConfirmedExpenses(prev => new Set([...prev, expense.id]))
      showToast('Gasto fixo confirmado!', 'success')
    } catch (error) {
      console.error('Erro ao confirmar gasto:', error)
      showToast('Erro ao confirmar gasto fixo', 'error')
    }
  }

  const handleRejectExpense = (expenseId: string) => {
    setDetectedExpenses(prev => prev.filter(e => e.id !== expenseId))
    showToast('Gasto rejeitado', 'info')
  }

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = não encontrado

      if (data) {
        setSettings({
          id: data.id,
          person1_name: data.person1_name || '',
          person1_salary: data.person1_salary || '',
          person1_payment_day: data.person1_payment_day || '',
          person1_tax_rate: data.person1_tax_rate || '',
          person2_name: data.person2_name || '',
          person2_salary: data.person2_salary || '',
          person2_payment_day: data.person2_payment_day || '',
          person2_tax_rate: data.person2_tax_rate || '',
        })
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      showToast('Erro ao carregar configurações', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        user_id: user?.id,
        person1_name: settings.person1_name || null,
        person1_salary: settings.person1_salary ? parseFloat(settings.person1_salary) : null,
        person1_payment_day: settings.person1_payment_day ? parseInt(settings.person1_payment_day) : null,
        person1_tax_rate: settings.person1_tax_rate ? parseFloat(settings.person1_tax_rate) : null,
        person2_name: settings.person2_name || null,
        person2_salary: settings.person2_salary ? parseFloat(settings.person2_salary) : null,
        person2_payment_day: settings.person2_payment_day ? parseInt(settings.person2_payment_day) : null,
        person2_tax_rate: settings.person2_tax_rate ? parseFloat(settings.person2_tax_rate) : null,
      }

      if (settings.id) {
        // Atualizar
        const { error } = await supabase
          .from('financial_settings')
          .update(dataToSave)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Inserir
        const { data, error } = await supabase
          .from('financial_settings')
          .insert([dataToSave])
          .select()
          .single()

        if (error) throw error
        setSettings({ ...settings, id: data.id })
      }

      showToast('Configurações salvas com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      showToast('Erro ao salvar configurações', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof FinancialSettings, value: string) => {
    setSettings({ ...settings, [field]: value })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[#D4C5B9] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando configurações...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Configurações Financeiras
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Configure os dados do casal para projeções financeiras precisas
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Pessoa 1 */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pessoa 1</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome
                </label>
                <Input
                  value={settings.person1_name}
                  onChange={(e) => handleChange('person1_name', e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Salário Mensal
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.person1_salary}
                  onChange={(e) => handleChange('person1_salary', e.target.value)}
                  placeholder="5000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dia do Pagamento
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.person1_payment_day}
                  onChange={(e) => handleChange('person1_payment_day', e.target.value)}
                  placeholder="5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Alíquota de Impostos (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.person1_tax_rate}
                  onChange={(e) => handleChange('person1_tax_rate', e.target.value)}
                  placeholder="27.5"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Porcentagem de impostos descontados do salário bruto
                </p>
              </div>
            </div>
          </div>

          {/* Pessoa 2 */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pessoa 2</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome
                </label>
                <Input
                  value={settings.person2_name}
                  onChange={(e) => handleChange('person2_name', e.target.value)}
                  placeholder="Ex: Maria Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Salário Mensal
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.person2_salary}
                  onChange={(e) => handleChange('person2_salary', e.target.value)}
                  placeholder="6000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dia do Pagamento
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.person2_payment_day}
                  onChange={(e) => handleChange('person2_payment_day', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Alíquota de Impostos (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.person2_tax_rate}
                  onChange={(e) => handleChange('person2_tax_rate', e.target.value)}
                  placeholder="15.0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Porcentagem de impostos descontados do salário bruto
                </p>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Recurring Expenses Detection */}
        <div className="mt-8 bg-white dark:bg-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Gastos Fixos Recorrentes</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">Detectados automaticamente das suas transações</p>
              </div>
            </div>
            <Button
              onClick={handleDetectExpenses}
              disabled={detectingExpenses}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              {detectingExpenses ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-[#D4C5B9] border-t-transparent rounded-full mr-2"></div>
                  <span className="hidden sm:inline">Analisando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Detectar Gastos</span>
                </>
              )}
            </Button>
          </div>

          {/* Detected Expenses List */}
          {detectedExpenses.length > 0 ? (
            <div className="space-y-3">
              {detectedExpenses.map((expense) => {
                const isConfirmed = confirmedExpenses.has(expense.id)
                const confidenceBadge = {
                  high: { label: 'Alta confiança', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
                  medium: { label: 'Média confiança', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
                  low: { label: 'Baixa confiança', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
                }[expense.confidence]

                return (
                  <div
                    key={expense.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isConfirmed
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-[#2a2a2a] border-gray-200 dark:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {expense.description}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${confidenceBadge.color}`}>
                            {confidenceBadge.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {expense.category_name}
                          </span>
                          <span className="font-semibold text-[#D4C5B9]">
                            {formatCurrency(expense.average_amount)}
                          </span>
                          <span>
                            {expense.occurrences} ocorrências
                          </span>
                          <span className="text-gray-500">
                            Última: {new Date(expense.last_occurrence).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!isConfirmed && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleConfirmExpense(expense)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Confirmar</span>
                          </Button>
                          <Button
                            onClick={() => handleRejectExpense(expense.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {isConfirmed && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 flex-shrink-0">
                          <Check className="h-5 w-5" />
                          <span className="text-sm font-medium hidden sm:inline">Confirmado</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clique em "Detectar Gastos" para analisar suas transações
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                O sistema identificará gastos que se repetem mensalmente
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Como funciona?
          </h3>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• As informações aqui são usadas para calcular a projeção financeira de 30 dias</li>
            <li>• O sistema detecta automaticamente seus gastos fixos recorrentes</li>
            <li>• A alíquota de impostos é opcional e ajuda a calcular o salário líquido</li>
            <li>• Você pode preencher apenas os campos necessários para sua situação</li>
          </ul>
        </div>
      </div>

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
