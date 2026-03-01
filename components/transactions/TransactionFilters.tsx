'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, Filter, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
}

interface TransactionFiltersProps {
  categories: Category[]
  onFilterChange: (filters: FilterState) => void
  currentFilters: FilterState
  onClose?: () => void
}

export interface FilterState {
  period: '7d' | '15d' | '30d' | '90d' | 'all' | 'custom'
  customStartDate?: string
  customEndDate?: string
  categoryIds: string[]
  type?: 'income' | 'expense' | 'all'
}

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todos' }
]

export function TransactionFilters({ categories, onFilterChange, currentFilters, onClose }: TransactionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters)

  const handlePeriodChange = (period: FilterState['period']) => {
    const newFilters = { ...localFilters, period }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newCategoryIds = localFilters.categoryIds.includes(categoryId)
      ? localFilters.categoryIds.filter(id => id !== categoryId)
      : [...localFilters.categoryIds, categoryId]

    const newFilters = { ...localFilters, categoryIds: newCategoryIds }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleTypeChange = (type: FilterState['type']) => {
    const newFilters = { ...localFilters, type }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const newFilters: FilterState = {
      period: '30d',
      categoryIds: [],
      type: 'all'
    }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const hasActiveFilters =
    localFilters.categoryIds.length > 0 ||
    localFilters.type !== 'all' ||
    localFilters.period !== '30d'

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Filtros
          </h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-[#D4C5B9] text-white text-xs rounded-full">
              {localFilters.categoryIds.length + (localFilters.type !== 'all' ? 1 : 0) + (localFilters.period !== '30d' ? 1 : 0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs"
          >
            Avançado
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Período */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Período</span>
        </label>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value as FilterState['period'])}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                localFilters.period === option.value
                  ? 'bg-[#D4C5B9] text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros Avançados */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
          {/* Tipo de Transação */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              Tipo de Transação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'income', label: 'Receitas' },
                { value: 'expense', label: 'Despesas' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value as FilterState['type'])}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    localFilters.type === option.value
                      ? option.value === 'income'
                        ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500'
                        : option.value === 'expense'
                        ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-2 border-rose-500'
                        : 'bg-gray-200 dark:bg-[#3a3a3a] text-gray-900 dark:text-gray-100 border-2 border-gray-400'
                      : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] border-2 border-transparent'
                  }`}
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.value === 'all' ? 'Todas' : option.value === 'income' ? 'Rec.' : 'Desp.'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categorias de Receita */}
          {incomeCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categorias de Receita
              </label>
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 sm:gap-1.5 min-h-[44px] ${
                      localFilters.categoryIds.includes(category.id)
                        ? 'ring-2 ring-offset-2 dark:ring-offset-[#1a1a1a]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: localFilters.categoryIds.includes(category.id)
                        ? category.color
                        : `${category.color}20`,
                      color: localFilters.categoryIds.includes(category.id) ? 'white' : category.color,
                      ringColor: category.color
                    }}
                  >
                    <span className="flex-shrink-0">{category.icon}</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categorias de Despesa */}
          {expenseCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categorias de Despesa
              </label>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 sm:gap-1.5 min-h-[44px] ${
                      localFilters.categoryIds.includes(category.id)
                        ? 'ring-2 ring-offset-2 dark:ring-offset-[#1a1a1a]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: localFilters.categoryIds.includes(category.id)
                        ? category.color
                        : `${category.color}20`,
                      color: localFilters.categoryIds.includes(category.id) ? 'white' : category.color,
                      ringColor: category.color
                    }}
                  >
                    <span className="flex-shrink-0">{category.icon}</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
