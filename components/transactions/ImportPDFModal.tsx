'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface ImportPDFModalProps {
  isOpen: boolean
  onClose: () => void
  onParsed: (transactions: any[], bankName?: string) => void
}

export function ImportPDFModal({ isOpen, onClose, onParsed }: ImportPDFModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setError('Por favor, selecione um arquivo PDF')
      return
    }

    setLoading(true)
    setError(null)
    setProcessingStep('Enviando PDF para processamento...')

    try {
      // Cria FormData para enviar o arquivo
      const formData = new FormData()
      formData.append('file', file)

      // Envia para a API
      setProcessingStep('Processando PDF no servidor...')
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao processar PDF')
        setLoading(false)
        return
      }

      if (data.errors && data.errors.length > 0) {
        setError(data.errors[0])
      }

      if (!data.transactions || data.transactions.length === 0) {
        setError('Nenhuma transação foi encontrada no PDF')
        setLoading(false)
        return
      }

      // Passa transações para o componente pai
      onParsed(data.transactions, data.bankName)
      onClose()
    } catch (err) {
      console.error('Error processing PDF:', err)
      setError(
        err instanceof Error
          ? `Erro ao processar PDF: ${err.message}`
          : 'Erro desconhecido ao processar PDF'
      )
    } finally {
      setLoading(false)
      setProcessingStep('')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Importar Extrato/Fatura
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Faça upload de um PDF do seu banco
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#D4C5B9] bg-[#D4C5B9]/5'
                  : 'border-gray-300 dark:border-[#3a3a3a] hover:border-[#D4C5B9] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={loading}
              />

              {loading ? (
                <div className="space-y-3">
                  <Loader2 className="h-12 w-12 text-[#D4C5B9] mx-auto animate-spin" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {processingStep}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Isso pode levar alguns segundos...
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Arraste seu PDF aqui
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    ou clique para selecionar
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#D4C5B9] text-[#D4C5B9] hover:bg-[#D4C5B9] hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Selecionar PDF
                  </Button>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    Erro ao processar arquivo
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium">Bancos suportados:</p>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• Nubank</li>
                    <li>• Itaú</li>
                    <li>• Bradesco</li>
                    <li>• Banco do Brasil</li>
                    <li>• Santander</li>
                    <li>• Caixa Econômica</li>
                    <li>• Banco Inter</li>
                    <li>• C6 Bank</li>
                    <li>• Outros formatos comuns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Dicas para melhor resultado:
              </p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>✓ Use o extrato ou fatura em formato PDF original do banco</li>
                <li>✓ Evite PDFs escaneados (imagens)</li>
                <li>✓ Certifique-se que o PDF não está protegido por senha</li>
                <li>✓ O sistema categorizará automaticamente as transações</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-[#2a2a2a]">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
