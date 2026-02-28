'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { X, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react'

interface SimpleImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: any) => void
}

export function SimpleImportModal({ isOpen, onClose, onSuccess }: SimpleImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [processedData, setProcessedData] = useState<any>(null)

  const handleFileSelect = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao processar arquivo')
        setLoading(false)
        return
      }

      setProcessedData(data)
    } catch (err) {
      console.error('Error:', err)
      setError('Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (processedData) {
      onSuccess(processedData)
      onClose()
      // Reset
      setProcessedData(null)
      setError(null)
    }
  }

  const handleCancel = () => {
    setProcessedData(null)
    setError(null)
    onClose()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
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
          <div className="p-6">
            {processedData ? (
              // Resumo após processamento
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Arquivo processado com sucesso!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {processedData.metadata?.totalTransactions || 0} transação(ões) encontrada(s)
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Formato detectado:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 uppercase">
                      {processedData.metadata?.format || 'Desconhecido'}
                    </span>
                  </div>
                  {processedData.metadata?.type && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {processedData.metadata.type === 'bank_statement' ? 'Extrato Bancário' :
                         processedData.metadata.type === 'credit_card' ? 'Fatura Cartão' : 'Desconhecido'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Receitas:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      R$ {(processedData.metadata?.totalIncome || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Despesas:</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      R$ {(processedData.metadata?.totalExpense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {processedData.metadata?.newCategoriesCreated?.length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-[#3a3a3a]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Categorias criadas automaticamente:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {processedData.metadata.newCategoriesCreated.map((cat: string) => (
                          <span key={cat} className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Upload area
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
                      Detectando formato e categorizando transações
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
                    <span>PDF, CSV, XML ou OFX</span>
                  </div>
                </div>
              )}
            </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {!processedData && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Detecção automática de colunas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Categorização inteligente com IA</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Criação automática de categorias</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {processedData && (
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-[#2a2a2a]">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
              >
                Importar {processedData.metadata?.totalTransactions || 0} Transação(ões)
              </Button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
