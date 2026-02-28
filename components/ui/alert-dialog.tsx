'use client'

import { X } from 'lucide-react'
import { Button } from './button'
import { Portal } from './portal'

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: AlertDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: '🗑️',
      iconBg: 'bg-rose-100 dark:bg-rose-950/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      confirmBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      icon: '⚠️',
      iconBg: 'bg-amber-100 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      confirmBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      confirmBg: 'bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white',
    },
  }

  const style = variantStyles[variant]

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Dialog */}
        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.iconBg}`}>
                <span className="text-2xl">{style.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 ${style.confirmBg}`}
              disabled={loading}
            >
              {loading ? 'Processando...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
