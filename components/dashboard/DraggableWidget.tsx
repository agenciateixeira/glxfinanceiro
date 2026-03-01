'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DraggableWidgetProps {
  id: string
  children: React.ReactNode
  isEditMode: boolean
  isVisible: boolean
  label: string
  onToggleVisibility: () => void
  order?: number
}

export function DraggableWidget({
  id,
  children,
  isEditMode,
  isVisible,
  label,
  onToggleVisibility,
  order,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isVisible ? 1 : 0.4,
    order: order !== undefined ? order : 0,
  }

  // Se não estiver visível e não estiver em modo de edição, não renderiza
  if (!isVisible && !isEditMode) {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isEditMode ? 'cursor-move' : ''} ${
        !isVisible && isEditMode ? 'ring-2 ring-dashed ring-gray-300 dark:ring-gray-600' : ''
      }`}
    >
      {/* Header de edição */}
      {isEditMode && (
        <div className="absolute -top-3 left-0 right-0 z-10 flex items-center justify-between px-3">
          <div className="flex items-center gap-2 bg-[#D4C5B9] text-white px-3 py-1 rounded-t-lg shadow-sm">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
              aria-label={`Arrastar ${label}`}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="h-7 px-2 bg-white dark:bg-[#1a1a1a] shadow-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
            title={isVisible ? 'Ocultar widget' : 'Mostrar widget'}
          >
            {isVisible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {/* Conteúdo do widget */}
      <div className={isEditMode ? 'pt-4' : ''}>
        {children}
      </div>

      {/* Overlay de widget oculto */}
      {!isVisible && isEditMode && (
        <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
          <div className="text-center">
            <EyeOff className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Widget Oculto
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
