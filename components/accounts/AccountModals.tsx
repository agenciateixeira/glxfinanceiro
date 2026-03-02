'use client'

import { useState, useEffect } from 'react'
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

// ===== CREATE ACCOUNT MODAL =====
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

// ===== EDIT ACCOUNT MODAL =====
export function EditAccountModal({ isOpen, account, onClose, onSuccess }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_type: 'checking',
    balance: '0',
    color: COLORS[0],
    is_default: false,
    is_active: true
  })

  // Preencher formulário quando a conta mudar
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        bank_name: account.bank_name || '',
        account_type: account.account_type || 'checking',
        balance: account.balance?.toString() || '0',
        color: account.color || COLORS[0],
        is_default: account.is_default || false,
        is_active: account.is_active !== undefined ? account.is_active : true
      })
    }
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          ...formData,
          balance: parseFloat(formData.balance) || 0
        })
        .eq('id', account.id)

      if (error) throw error
      toast.success('Conta atualizada com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar conta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !account) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Editar Conta</h2>
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
            <label className="block text-sm font-medium mb-2">Saldo</label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0a0a0a] dark:border-[#2a2a2a]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Atenção: Alterar o saldo manualmente pode desconciliar com as transações
            </p>
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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">Conta ativa</span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-[#8B7355]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== DELETE ACCOUNT DIALOG =====
export function DeleteAccountDialog({ isOpen, account, onClose, onSuccess }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [hasTransactions, setHasTransactions] = useState(false)

  // Verificar se tem transações ao abrir
  useEffect(() => {
    if (isOpen && account) {
      checkTransactions()
    }
  }, [isOpen, account])

  const checkTransactions = async () => {
    if (!account) return

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_account_id', account.id)

    setHasTransactions((count || 0) > 0)
  }

  const handleDelete = async () => {
    if (!account) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', account.id)

      if (error) throw error
      toast.success('Conta excluída com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir conta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !account) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-red-600">Excluir Conta</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir a conta <strong>{account.name}</strong>?
          </p>

          {hasTransactions && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Esta conta possui transações associadas.
                Ao excluir a conta, as transações não serão excluídas, mas perderão a vinculação com a conta.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== TRANSFER MODAL =====
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
