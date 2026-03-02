'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { X, Loader2, Wallet, PiggyBank, CreditCard, TrendingUp, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: Wallet },
  { value: 'savings', label: 'Poupança', icon: PiggyBank },
  { value: 'credit', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'investment', label: 'Investimentos', icon: TrendingUp },
  { value: 'other', label: 'Outros', icon: MoreHorizontal }
]

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'
]

export function CreateAccountModal({ isOpen, onClose, onSuccess }: any) {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_type: 'checking',
    balance: '0',
    color: COLORS[0],
    is_default: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      const { error } = await supabase.from('bank_accounts').insert({
        user_id: user.id,
        ...formData,
        balance: parseFloat(formData.balance) || 0
      })

      if (error) throw error
      toast.success('Conta criada com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Nova Conta</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome da Conta *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
              placeholder="Ex: Nubank, Itaú..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Banco</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({...formData, account_type: type.value as any})}
                  className={`p-3 border rounded-lg flex items-center gap-2 ${
                    formData.account_type === type.value
                      ? 'border-[#8B7355] bg-[#8B7355]/10'
                      : 'border-gray-200 dark:border-[#2a2a2a]'
                  }`}
                >
                  <type.icon className="h-4 w-4" />
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Saldo Inicial</label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({...formData, color})}
                  className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-[#8B7355]' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">Definir como conta padrão</span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-[#8B7355]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
