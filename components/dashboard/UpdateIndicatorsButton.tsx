'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function UpdateIndicatorsButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleUpdate = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/update-indicators', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✅ ${data.message}`)
        // Recarregar a página após 2 segundos
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setMessage(`❌ ${data.message}`)
      }
    } catch (error) {
      setMessage('❌ Erro ao atualizar indicadores')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleUpdate}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Atualizando...' : 'Atualizar Indicadores'}
      </Button>
      {message && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  )
}
