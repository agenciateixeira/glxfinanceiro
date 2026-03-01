'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, Loader2, Search, ChevronDown } from 'lucide-react'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { DeleteCategoryDialog } from '@/components/categories/DeleteCategoryDialog'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  is_system: boolean
  created_at: string
}

export default function CategoriesPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    income: true,
    expense: true
  })

  const toggleSection = (section: 'income' | 'expense') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  useEffect(() => {
    if (user) {
      fetchCategories()

      // Setup Realtime subscription
      const channel = supabase
        .channel('categories-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Reload categories when any change happens
            fetchCategories()
          }
        )
        .subscribe()

      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user?.id},is_system.eq.true`)
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const incomeCategories = filteredCategories.filter(c => c.type === 'income')
  const expenseCategories = filteredCategories.filter(c => c.type === 'expense')

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Categorias
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie suas categorias de receitas e despesas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Categorias</p>
            <p className="text-lg sm:text-2xl font-bold text-[#8B7355]">
              {categories.length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Receitas</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {incomeCategories.length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Despesas</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
              {expenseCategories.length}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 sm:h-11 pl-10 pr-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-10 sm:h-11 bg-[#8B7355] hover:bg-[#7A6347] text-white whitespace-nowrap"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Categoria</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#8B7355] animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Income Categories Section */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
              <button
                onClick={() => toggleSection('income')}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-[#2a2a2a] bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Receitas
                    </h2>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      ({incomeCategories.length})
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
                      expandedSections.income ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {expandedSections.income && (
                <>
                  {incomeCategories.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria de receita cadastrada'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                      {incomeCategories.map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEdit={setEditingCategory}
                          onDelete={setDeletingCategory}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Expense Categories Section */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
              <button
                onClick={() => toggleSection('expense')}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-[#2a2a2a] bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Despesas
                    </h2>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      ({expenseCategories.length})
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
                      expandedSections.expense ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {expandedSections.expense && (
                <>
                  {expenseCategories.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria de despesa cadastrada'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                      {expenseCategories.map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEdit={setEditingCategory}
                          onDelete={setDeletingCategory}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchCategories}
      />

      <EditCategoryModal
        isOpen={!!editingCategory}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSuccess={fetchCategories}
      />

      <DeleteCategoryDialog
        isOpen={!!deletingCategory}
        category={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onSuccess={fetchCategories}
      />
    </DashboardLayout>
  )
}

interface CategoryRowProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Icon and Name */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.type === 'income' ? (
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: category.color }} />
            ) : (
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: category.color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
              {category.name}
            </h3>
            {category.is_system && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 text-xs rounded-full">
                Sistema
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!category.is_system && (
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => onEdit(category)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
