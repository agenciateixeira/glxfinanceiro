'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Camera, User, Phone, FileText, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string | null
  email: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: ''
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      // Buscar dados do perfil
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (userError) throw userError

      // Buscar email do auth.users
      const { data: authData } = await supabase.auth.getUser()

      const profileData: Profile = {
        id: userData.id,
        full_name: userData.full_name || '',
        avatar_url: userData.avatar_url,
        phone: userData.phone,
        bio: userData.bio,
        email: authData.user?.email || ''
      }

      setProfile(profileData)
      setFormData({
        full_name: profileData.full_name,
        phone: profileData.phone || '',
        bio: profileData.bio || ''
      })
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB')
      return
    }

    try {
      setUploading(true)

      // Deletar avatar anterior se existir
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload nova imagem
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Atualizar estado local
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      toast.success('Foto de perfil atualizada!')
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao atualizar foto de perfil')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          bio: formData.bio || null
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile(prev => prev ? {
        ...prev,
        full_name: formData.full_name,
        phone: formData.phone || null,
        bio: formData.bio || null
      } : null)

      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      bio: profile?.bio || ''
    })
  }

  const hasChanges = profile && (
    formData.full_name !== profile.full_name ||
    formData.phone !== (profile.phone || '') ||
    formData.bio !== (profile.bio || '')
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-[#8B7355] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Meu Perfil
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie suas informações pessoais
          </p>
        </div>

        <div className="space-y-6">
          {/* Foto de Perfil */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Foto de Perfil
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar - estilo Instagram */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-[#2a2a2a] bg-gray-100 dark:bg-[#2a2a2a]">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Foto de perfil"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Botão de câmera sobreposto */}
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-[#8B7355] hover:bg-[#7A6347] disabled:bg-gray-400 text-white rounded-full p-3 shadow-lg transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {profile?.full_name || 'Usuário'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Clique no ícone da câmera para alterar sua foto
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Tamanho máximo: 2MB • Formatos: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          {/* Informações Pessoais */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Informações Pessoais
            </h2>

            <div className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Não editável
                  </span>
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Conte um pouco sobre você..."
                    rows={4}
                    maxLength={500}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B7355] resize-none"
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {formData.bio.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            {hasChanges && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-[#2a2a2a]">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-[#8B7355] hover:bg-[#7A6347] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
