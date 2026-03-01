'use client'

import { Save, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditModeBarProps {
  onSave: () => void
  onCancel: () => void
  onReset: () => void
  hasChanges: boolean
}

export function EditModeBar({ onSave, onCancel, onReset, hasChanges }: EditModeBarProps) {
  return (
    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl">🎨</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Modo de Edição Ativo
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Arraste os widgets para reorganizar ou use os botões para ocultar/mostrar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="border-gray-300 dark:border-gray-600"
            title="Redefinir para layout padrão"
          >
            <RotateCcw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Redefinir</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="border-gray-300 dark:border-gray-600"
          >
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            className="bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
