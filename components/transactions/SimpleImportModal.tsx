'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import { SmartImportReview } from './SmartImportReview'

interface SimpleImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Array<{
    id: string
    name: string
    type: 'income' | 'expense'
    icon?: string
    color?: string
  }>
}

export function SimpleImportModal({ isOpen, onClose, onSuccess, categories }: SimpleImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importData, setImportData] = useState<any>(null)

  const handleFileSelect = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use smart import endpoint
      const response = await fetch('/api/import-smart', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao processar arquivo')
        setLoading(false)
        return
      }

      // Show SmartImportReview with suggestions
      setImportData(data)
    } catch (err) {
      console.error('Error:', err)
      setError('Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (selectedTransactions: any[], period: any) => {
    try {
      setImporting(true)
      setError(null)

      console.log('[SimpleImportModal] handleConfirm called with:', {
        count: selectedTransactions.length,
        period,
        sample: selectedTransactions.slice(0, 2)
      })

      // Send to confirm-import-smart endpoint
      const response = await fetch('/api/confirm-import-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactions: selectedTransactions,
          period
        })
      })

      const result = await response.json()
      console.log('[SimpleImportModal] Response from API:', result)

      if (!response.ok) {
        setError(result.error || 'Erro ao confirmar importação')
        setImporting(false)
        return
      }

      // Check if there were failures
      if (result.failed > 0 && result.results) {
        console.error('[SimpleImportModal] Import had failures:', {
          imported: result.imported,
          failed: result.failed,
          firstError: result.results[0]
        })

        // Show error message
        setError(`Falha ao importar ${result.failed} transações. Primeira erro: ${result.results[0]?.error || 'Erro desconhecido'}`)
        setImporting(false)
        return
      }

      // Success
      console.log('[SimpleImportModal] Import successful, calling onSuccess()')
      onSuccess()
      handleCancel()
    } catch (err) {
      console.error('Error confirming import:', err)
      setError('Erro ao confirmar importação')
      setImporting(false)
    }
  }

  const handleCancel = () => {
    setImportData(null)
    setError(null)
    setImporting(false)
    onClose()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  if (!isOpen) return null

  // Show SmartImportReview if we have import data
  if (importData) {
    return (
      <SmartImportReview
        transactions={importData.transactions}
        categories={categories}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        period={importData.metadata.period}
        importing={importing}
      />
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-[#2a2a2a] sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              Importar Arquivo
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {/* Upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#D4C5B9] bg-[#D4C5B9]/5'
                  : 'border-gray-300 dark:border-[#3a3a3a] hover:border-[#D4C5B9]'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xml,.ofx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />

              {loading ? (
                <div className="space-y-4">
                  <Loader2 className="h-16 w-16 text-[#D4C5B9] mx-auto animate-spin" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Processando arquivo...
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Analisando transações e buscando sugestões inteligentes
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Arraste seu arquivo aqui
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ou clique para selecionar
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="h-4 w-4" />
                    <span>PDF ou CSV</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Aprendizado inteligente de padrões</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Sugestões automáticas de categorização</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Detecção automática de período</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
