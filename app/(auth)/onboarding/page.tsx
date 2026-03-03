'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BasicInfoStep } from '@/components/onboarding/BasicInfoStep'
import { HouseholdTypeStep, type HouseholdType } from '@/components/onboarding/HouseholdTypeStep'
import { MembersStep, type Member } from '@/components/onboarding/MembersStep'
import { GoalsStep } from '@/components/onboarding/GoalsStep'
import { LoadingStep } from '@/components/onboarding/LoadingStep'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface OnboardingData {
  familyName: string
  userName: string
  userEmail: string
  userPhone: string
  householdType: HouseholdType
  members: Member[]
  primaryGoal: string
  goalDescription: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState<OnboardingData>({
    familyName: '',
    userName: '',
    userEmail: '',
    userPhone: '',
    householdType: 'individual',
    members: [],
    primaryGoal: '',
    goalDescription: '',
  })

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    setUser(user)
    setFormData((prev) => ({
      ...prev,
      userName: userData?.full_name || '',
      userEmail: user.email || '',
      userPhone: userData?.phone || '',
    }))
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const totalSteps = formData.householdType === 'individual' ? 4 : 5

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.familyName.trim() && formData.userName.trim()
      case 2:
        return formData.householdType !== ''
      case 3:
        if (formData.householdType === 'individual') {
          return true // Pula o step 3 para individual
        }
        // Para couple e family, precisa ter pelo menos 1 membro com nome e email
        return formData.members.length > 0 && formData.members.every(m => m.name.trim() && m.email.trim())
      case 4:
        return formData.primaryGoal !== ''
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (!canProceed()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Se for individual, pula o step 3
    if (currentStep === 2 && formData.householdType === 'individual') {
      setCurrentStep(4)
      return
    }

    // Se for couple ou family e estiver no step 2, vai para o step 3
    if (currentStep === 2 && formData.householdType !== 'individual') {
      setCurrentStep(3)
      return
    }

    // Avança normalmente
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    // Se for individual e estiver no step 4, volta para step 2
    if (currentStep === 4 && formData.householdType === 'individual') {
      setCurrentStep(2)
      return
    }

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setCompleting(true)

    try {
      // 1. Criar household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          family_name: formData.familyName,
          household_type: formData.householdType,
          owner_id: user.id,
          onboarding_completed: true,
          primary_goal: formData.primaryGoal,
          goal_description: formData.goalDescription,
        })
        .select()
        .single()

      if (householdError) throw householdError

      // 2. Atualizar usuário com household_id
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          household_id: household.id,
          role_in_household: 'owner',
          full_name: formData.userName,
          phone: formData.userPhone,
        })
        .eq('id', user.id)

      if (userUpdateError) throw userUpdateError

      // 3. Criar household_member para o owner
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'owner',
          name: formData.userName,
          email: formData.userEmail,
          invitation_status: 'accepted',
          joined_at: new Date().toISOString(),
          can_manage_members: true,
          can_manage_finances: true,
        })

      if (memberError) throw memberError

      // 4. Criar onboarding_data
      const { error: onboardingError } = await supabase
        .from('onboarding_data')
        .insert({
          household_id: household.id,
          step_basic_info: true,
          step_household_type: true,
          step_members: true,
          step_goals: true,
          step_completed: true,
          completed_at: new Date().toISOString(),
          data: formData,
        })

      if (onboardingError) throw onboardingError

      // 5. Se tiver membros, criar registros de convite
      if (formData.members.length > 0) {
        const membersToInsert = formData.members.map((member) => ({
          household_id: household.id,
          user_id: null, // Será preenchido quando o usuário aceitar o convite
          role: member.role,
          name: member.name,
          email: member.email,
          phone: member.phone,
          invitation_status: 'pending',
          invited_at: new Date().toISOString(),
          can_manage_members: false,
          can_manage_finances: true,
        }))

        const { error: membersError } = await supabase
          .from('household_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      // Aguardar um pouco para mostrar a animação de loading
      await new Promise((resolve) => setTimeout(resolve, 3000))

      toast.success('Configuração concluída com sucesso!')

      // Redirecionar para o dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Erro ao completar onboarding:', error)
      toast.error(error.message || 'Erro ao completar configuração')
      setLoading(false)
      setCompleting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4C5B9]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F6F4] to-[#E8E4E0]">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Passo {Math.min(currentStep, totalSteps)} de {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((Math.min(currentStep, totalSteps) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#D4C5B9] h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(Math.min(currentStep, totalSteps) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 && (
            <BasicInfoStep
              familyName={formData.familyName}
              userName={formData.userName}
              userEmail={formData.userEmail}
              userPhone={formData.userPhone}
              onUpdate={updateField}
            />
          )}

          {currentStep === 2 && (
            <HouseholdTypeStep
              selectedType={formData.householdType}
              onSelect={(type) => updateField('householdType', type)}
            />
          )}

          {currentStep === 3 && formData.householdType !== 'individual' && (
            <MembersStep
              householdType={formData.householdType}
              members={formData.members}
              onUpdate={(members) => updateField('members', members)}
            />
          )}

          {currentStep === 4 && (
            <GoalsStep
              primaryGoal={formData.primaryGoal}
              goalDescription={formData.goalDescription}
              onUpdate={updateField}
            />
          )}

          {currentStep === 5 && (
            <LoadingStep isComplete={!completing && !loading} />
          )}

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || loading}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="gap-2 bg-[#D4C5B9] hover:bg-[#C4B5A9] text-white"
              >
                {currentStep === totalSteps ? 'Finalizar' : 'Continuar'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
