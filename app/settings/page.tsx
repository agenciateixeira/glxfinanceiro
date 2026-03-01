'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Loader2, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SpouseData {
  id: string
  email: string
  full_name: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [spouse, setSpouse] = useState<SpouseData | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (user) {
      fetchSpouse()
    }
  }, [user])

  const fetchSpouse = async () => {
    try {
      setLoading(true)

      console.log('[Settings] Buscando cônjuge para user:', user?.id)

      // Busca vínculo
      const { data: link, error: linkError } = await supabase
        .from('shared_accounts')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle()

      console.log('[Settings] Vínculo encontrado:', link, 'Error:', linkError)

      if (link) {
        // Identifica o ID do cônjuge
        const spouseId = link.user1_id === user?.id ? link.user2_id : link.user1_id
        console.log('[Settings] ID do cônjuge:', spouseId)

        // Busca dados do cônjuge - usa API para obter email do auth.users
        const response = await fetch('/api/get-spouse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spouseId })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[Settings] Dados do cônjuge:', data.spouse)
          setSpouse(data.spouse)
        } else {
          console.error('[Settings] Erro ao buscar dados do cônjuge')
        }
      }
    } catch (error) {
      console.error('Erro ao buscar cônjuge:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !fullName) {
      toast.error('Preencha todos os campos')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/create-spouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar cônjuge')
      }

      toast.success('Cônjuge cadastrado com sucesso!')
      setSpouse(data.spouse)
      setShowAddForm(false)
      setEmail('')
      setPassword('')
      setFullName('')
    } catch (error: any) {
      console.error('Erro ao cadastrar cônjuge:', error)
      toast.error(error.message || 'Erro ao cadastrar cônjuge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveSpouse = async () => {
    if (!spouse || !confirm('Tem certeza que deseja desvincular o cônjuge? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch('/api/delete-spouse', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao desvincular cônjuge')
      }

      toast.success('Cônjuge desvinculado com sucesso')
      setSpouse(null)
    } catch (error: any) {
      console.error('Erro ao remover vínculo:', error)
      toast.error(error.message || 'Erro ao desvincular cônjuge')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Configurações
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie as configurações da sua conta
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#8B7355] animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Spouse Section */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#8B7355]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Cônjuge
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Compartilhe o acesso à gestão financeira com seu cônjuge
                </p>
              </div>

              <div className="p-4 sm:p-6">
                {spouse ? (
                  /* Spouse linked */
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {spouse.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {spouse.email}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            Conta vinculada com sucesso
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleRemoveSpouse}
                        variant="outline"
                        size="sm"
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-300 dark:border-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#2a2a2a] p-4 rounded-lg">
                      <p className="font-medium mb-2">ℹ️ Informações importantes:</p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>Ambos têm acesso total a todas as transações, categorias e metas</li>
                        <li>Qualquer um pode adicionar, editar ou excluir dados</li>
                        <li>As credenciais de login são: {spouse.email} e a senha que você cadastrou</li>
                      </ul>
                    </div>
                  </div>
                ) : showAddForm ? (
                  /* Add spouse form */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome Completo *
                      </label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        required
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="conjugue@exemplo.com"
                        required
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Senha * (mínimo 6 caracteres)
                      </label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        required
                        minLength={6}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Esta será a senha que seu cônjuge usará para fazer login
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false)
                          setEmail('')
                          setPassword('')
                          setFullName('')
                        }}
                        className="flex-1"
                        disabled={submitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#8B7355] hover:bg-[#7A6347] text-white"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Cadastrando...
                          </>
                        ) : (
                          'Cadastrar Cônjuge'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* No spouse, show add button */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                      <UserPlus className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Você ainda não cadastrou um cônjuge
                    </p>
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="bg-[#8B7355] hover:bg-[#7A6347] text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Cadastrar Cônjuge
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
