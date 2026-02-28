'use client'

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useEffect } from 'react'

interface ToastProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
  duration?: number
}

export function Toast({
  isOpen,
  onClose,
  title,
  description,
  variant = 'success',
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const variantStyles = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
      <div
        className={`${style.bg} ${style.border} border rounded-xl shadow-lg p-4 min-w-[320px] max-w-md`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
