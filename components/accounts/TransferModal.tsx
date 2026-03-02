'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function TransferModal({ isOpen, onClose, onSuccess, accounts }: any) {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    transfer_date: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (formData.from_account_id === formData.to_account_id) {
      toast.error('Não é possível transferir para a mesma conta')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from('account_transfers').insert({
        user_id: user.id,
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        transfer_date: formData.transfer_date
      })

      if (error) throw error
      toast.success('Transferência realizada com sucesso!')
      onSuccess()
      onClose()

      // Resetar formulário
      setFormData({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        description: '',
        transfer_date: new Date().toISOString().split('T')[0]
      })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao realizar transferência')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const activeAccounts = accounts?.filter((acc: any) => acc.is_active) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Transferir entre Contas</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">De (Conta Origem) *</label>
            <select
              required
              value={formData.from_account_id}
              onChange={(e) => setFormData({...formData, from_account_id: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            >
              <option value="">Selecione...</option>
              {activeAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - R$ {Number(acc.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Para (Conta Destino) *</label>
            <select
              required
              value={formData.to_account_id}
              onChange={(e) => setFormData({...formData, to_account_id: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            >
              <option value="">Selecione...</option>
              {activeAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - R$ {Number(acc.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Valor *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data da Transferência</label>
            <input
              type="date"
              value={formData.transfer_date}
              onChange={(e) => setFormData({...formData, transfer_date: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
              rows={3}
              placeholder="Ex: Transferência de reserva de emergência"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-[#8B7355]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transferir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
