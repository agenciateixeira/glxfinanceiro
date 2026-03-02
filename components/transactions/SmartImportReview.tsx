'use client'

import { useState, useMemo } from 'react'
import { Check, X, TrendingUp, TrendingDown, Search, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Toast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SmartTransaction {
  date: string
  description: string
  amount: number
  raw_type?: 'positive' | 'negative'
  suggested_type?: 'income' | 'expense'
  suggested_category_id?: string
  suggestion_confidence?: number
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon?: string
  color?: string
}

interface ClassifiedTransaction {
  original: SmartTransaction
  selected: boolean
  type: 'income' | 'expense'
  category_id: string | null
  category_name?: string
}

interface SmartImportReviewProps {
  transactions: SmartTransaction[]
  categories: Category[]
  onConfirm: (transactions: ClassifiedTransaction[], period: any) => void
  onCancel: () => void
  period: {
    start: string
    end: string
    type: 'monthly' | 'weekly' | 'custom'
    label: string
  }
  importing?: boolean
}

export function SmartImportReview({
  transactions: rawTransactions,
  categories: initialCategories,
  onConfirm,
  onCancel,
  period,
  importing = false
}: SmartImportReviewProps) {
  // Estado inicial das transações
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>(
    rawTransactions.map(t => ({
      original: t,
      selected: true,
      type: t.suggested_type || (t.raw_type === 'negative' ? 'expense' : 'income'),
      category_id: t.suggested_category_id || null
    }))
  )

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [search, setSearch] = useState('')
  const [newCategoryName, setNewCategoryName] = useState<{ [key: number]: string }>({})
  const [toast, setToast] = useState<{ isOpen: boolean; title: string; description?: string; variant?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: ''
  })

  // Filtros e totais
  const selectedTransactions = transactions.filter(t => t.selected)
  const totalIncome = selectedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.original.amount, 0)
  const totalExpense = selectedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.original.amount, 0)

  // Formata valor no padrão brasileiro: R$ 1.234,56
  const formatBRL = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Filtra transações por busca
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions
    const lowerSearch = search.toLowerCase()
    return transactions.filter(t =>
      t.original.description.toLowerCase().includes(lowerSearch)
    )
  }, [transactions, search])

  // Toggle seleção
  const toggleSelect = (index: number) => {
    setTransactions(prev => prev.map((t, i) =>
      i === index ? { ...t, selected: !t.selected } : t
    ))
  }

  // Selecionar todas
  const toggleSelectAll = () => {
    const allSelected = transactions.every(t => t.selected)
    setTransactions(prev => prev.map(t => ({ ...t, selected: !allSelected })))
  }

  // Alterar tipo
  const changeType = (index: number, type: 'income' | 'expense') => {
    setTransactions(prev => prev.map((t, i) =>
      i === index ? { ...t, type, category_id: null } : t
    ))
  }

  // Alterar categoria
  const changeCategory = (index: number, categoryId: string) => {
    if (categoryId === 'new') {
      // Criar nova categoria - mostra campo de input
      setTransactions(prev => prev.map((t, i) =>
        i === index ? { ...t, category_id: null, category_name: '' } : t
      ))
    } else {
      setTransactions(prev => prev.map((t, i) =>
        i === index ? { ...t, category_id: categoryId, category_name: undefined } : t
      ))
    }
  }

  // Salvar nome de nova categoria
  const saveNewCategory = async (index: number) => {
    const name = newCategoryName[index]
    if (!name || name.trim() === '') {
      return // Não salva se estiver vazio
    }

    const transaction = transactions[index]
    const categoryType = transaction.type

    try {
      // Cria a categoria no banco
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type: categoryType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar categoria')
      }

      const { category } = await response.json()

      // Adiciona a categoria na lista local
      setCategories(prev => [...prev, category])

      // Atualiza a transação com a nova categoria
      setTransactions(prev => prev.map((t, i) =>
        i === index ? { ...t, category_id: category.id, category_name: undefined } : t
      ))

      // Limpa o input
      setNewCategoryName(prev => ({ ...prev, [index]: '' }))

      // Mostra toast de sucesso
      setToast({
        isOpen: true,
        title: 'Categoria criada com sucesso!',
        description: `A categoria "${category.name}" foi criada.`,
        variant: 'success'
      })
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      setToast({
        isOpen: true,
        title: 'Erro ao criar categoria',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error'
      })
    }
  }

  // Confirmar importação
  const handleConfirm = () => {
    // Verifica se há categorias pendentes de criação
    const hasPendingCategories = selectedTransactions.some(t => t.category_name !== undefined)

    if (hasPendingCategories) {
      setToast({
        isOpen: true,
        title: 'Categorias pendentes',
        description: 'Por favor, confirme ou cancele a criação de todas as categorias antes de importar.',
        variant: 'error'
      })
      return
    }

    console.log('[SmartImportReview] Confirming import:', {
      count: selectedTransactions.length,
      period,
      sample: selectedTransactions.slice(0, 2)
    })

    console.log('[SmartImportReview] Sending transactions:', selectedTransactions.slice(0, 2))

    onConfirm(selectedTransactions, period)
  }

  // Confiança da sugestão
  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence || confidence === 0) return null

    if (confidence >= 70) {
      return <Badge variant="default" className="bg-green-500">Alta confiança</Badge>
    } else if (confidence >= 40) {
      return <Badge variant="secondary">Média confiança</Badge>
    } else {
      return <Badge variant="outline">Baixa confiança</Badge>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Revisar Transações Importadas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {transactions.length} transação(ões) encontrada(s) - {period.label}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Selecionadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedTransactions.length} de {transactions.length}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Receitas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {formatBRL(totalIncome)}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">Despesas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {formatBRL(totalExpense)}
              </p>
            </div>
          </div>

          {/* Busca e Seleção */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar transação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={toggleSelectAll}>
              {transactions.every(t => t.selected) ? 'Desmarcar todas' : 'Selecionar todas'}
            </Button>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredTransactions.map((transaction, index) => {
            const confidence = transaction.original.suggestion_confidence
            const availableCategories = categories.filter(c => c.type === transaction.type)

            return (
              <div
                key={index}
                className={`border rounded-xl p-4 transition-all ${
                  transaction.selected
                    ? 'border-[#D4C5B9] bg-[#F5F1ED] dark:bg-[#2a2a2a] dark:border-[#D4C5B9]'
                    : 'border-gray-200 dark:border-[#2a2a2a] opacity-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(index)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      transaction.selected
                        ? 'bg-[#D4C5B9] border-[#D4C5B9]'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {transaction.selected && <Check className="h-3 w-3 text-white" />}
                  </button>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    {/* Header da transação */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {transaction.original.description.substring(0, 60)}
                            {transaction.original.description.length > 60 && '...'}
                          </p>
                          {getConfidenceBadge(confidence)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.original.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          transaction.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'} R$ {formatBRL(transaction.original.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex gap-3">
                      {/* Tipo */}
                      <div className="flex-1">
                        <Select
                          value={transaction.type}
                          onValueChange={(value: 'income' | 'expense') => changeType(index, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                Receita
                              </div>
                            </SelectItem>
                            <SelectItem value="expense">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                Despesa
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Categoria */}
                      <div className="flex-[2]">
                        {transaction.category_name !== undefined ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nome da nova categoria"
                              value={newCategoryName[index] || transaction.category_name}
                              onChange={(e) => setNewCategoryName(prev => ({ ...prev, [index]: e.target.value }))}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => saveNewCategory(index)}
                              className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
                              disabled={!newCategoryName[index]?.trim()}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTransactions(prev => prev.map((t, i) =>
                                i === index ? { ...t, category_name: undefined, category_id: null } : t
                              ))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={transaction.category_id || 'none'}
                            onValueChange={(value) => changeCategory(index, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {availableCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="new">
                                <div className="font-medium text-[#D4C5B9]">
                                  + Criar nova categoria
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{selectedTransactions.length}</strong> transação(ões) será(ão) importada(s)
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedTransactions.length === 0 || importing}
                className="bg-[#B8A596] hover:bg-[#A89585] text-white"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Confirmar Importação'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {importing && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl max-w-md mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 text-[#B8A596] animate-spin" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Importando Transações
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Processando {selectedTransactions.length} transação(ões)...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Aguarde enquanto salvamos suas transações e aprendemos os padrões
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificação */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
