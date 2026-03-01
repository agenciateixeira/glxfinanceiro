import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WidgetConfig {
  id: string
  label: string
  position: number
  isVisible: boolean
}

// Layout padrão dos widgets
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'projection-alert', label: 'Alerta de Projeção', position: 0, isVisible: true },
  { id: 'financial-insights', label: 'Insights Financeiros', position: 1, isVisible: true },
  { id: 'goal-progress', label: 'Progresso da Meta', position: 2, isVisible: true },
  { id: 'recent-transactions', label: 'Transações Recentes', position: 3, isVisible: true },
  { id: 'upcoming-expenses', label: 'Próximos Gastos', position: 4, isVisible: true },
  { id: 'comparison', label: 'Comparativo do Período', position: 5, isVisible: true },
  { id: 'income-stat', label: 'Receita Mensal', position: 6, isVisible: true },
  { id: 'fixed-expenses-stat', label: 'Gastos Fixos', position: 7, isVisible: true },
  { id: 'variable-expenses-stat', label: 'Gastos Variáveis', position: 8, isVisible: true },
  { id: 'balance-stat', label: 'Saldo do Mês', position: 9, isVisible: true },
  { id: 'fixed-expenses-list', label: 'Lista de Gastos Fixos', position: 10, isVisible: true },
  { id: 'variable-expenses-chart', label: 'Gastos por Categoria', position: 11, isVisible: true },
]

interface UseWidgetLayoutReturn {
  widgets: WidgetConfig[]
  isLoading: boolean
  updateWidgetOrder: (widgetIds: string[]) => Promise<void>
  toggleWidgetVisibility: (widgetId: string) => Promise<void>
  resetToDefault: () => Promise<void>
}

export function useWidgetLayout(userId: string | undefined): UseWidgetLayoutReturn {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Carregar configuração salva do usuário
  const loadLayout = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('dashboard_layout')
        .select('widget_id, position, is_visible')
        .eq('user_id', userId)
        .order('position')

      if (error) throw error

      if (data && data.length > 0) {
        // Merge com configuração padrão
        const savedConfig = new Map(
          data.map(item => [item.widget_id, { position: item.position, isVisible: item.is_visible }])
        )

        const mergedWidgets = DEFAULT_WIDGETS.map(widget => {
          const saved = savedConfig.get(widget.id)
          return saved
            ? { ...widget, position: saved.position, isVisible: saved.isVisible }
            : widget
        }).sort((a, b) => a.position - b.position)

        setWidgets(mergedWidgets)
      } else {
        // Usar configuração padrão
        setWidgets(DEFAULT_WIDGETS)
      }
    } catch (error) {
      console.error('Erro ao carregar layout:', error)
      setWidgets(DEFAULT_WIDGETS)
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    loadLayout()
  }, [loadLayout])

  // Atualizar ordem dos widgets
  const updateWidgetOrder = useCallback(async (widgetIds: string[]) => {
    if (!userId) return

    // Atualizar estado local imediatamente para UX responsiva
    const updatedWidgets = widgetIds.map((id, index) => {
      const widget = widgets.find(w => w.id === id)
      return widget ? { ...widget, position: index } : null
    }).filter(Boolean) as WidgetConfig[]

    setWidgets(updatedWidgets)

    try {
      // Salvar no banco de dados
      const updates = updatedWidgets.map((widget, index) => ({
        user_id: userId,
        widget_id: widget.id,
        position: index,
        is_visible: widget.isVisible,
      }))

      // Upsert em batch
      const { error } = await supabase
        .from('dashboard_layout')
        .upsert(updates, {
          onConflict: 'user_id,widget_id',
        })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar ordem dos widgets:', error)
      // Reverter para estado anterior em caso de erro
      await loadLayout()
    }
  }, [userId, widgets, supabase, loadLayout])

  // Toggle visibilidade de um widget
  const toggleWidgetVisibility = useCallback(async (widgetId: string) => {
    if (!userId) return

    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    const newVisibility = !widget.isVisible

    // Atualizar estado local
    setWidgets(prev =>
      prev.map(w => w.id === widgetId ? { ...w, isVisible: newVisibility } : w)
    )

    try {
      // Salvar no banco de dados
      const { error } = await supabase
        .from('dashboard_layout')
        .upsert({
          user_id: userId,
          widget_id: widgetId,
          position: widget.position,
          is_visible: newVisibility,
        }, {
          onConflict: 'user_id,widget_id',
        })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao atualizar visibilidade:', error)
      // Reverter em caso de erro
      await loadLayout()
    }
  }, [userId, widgets, supabase, loadLayout])

  // Resetar para configuração padrão
  const resetToDefault = useCallback(async () => {
    if (!userId) return

    setWidgets(DEFAULT_WIDGETS)

    try {
      // Deletar todas as configurações personalizadas
      const { error } = await supabase
        .from('dashboard_layout')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao resetar layout:', error)
    }
  }, [userId, supabase])

  return {
    widgets,
    isLoading,
    updateWidgetOrder,
    toggleWidgetVisibility,
    resetToDefault,
  }
}
