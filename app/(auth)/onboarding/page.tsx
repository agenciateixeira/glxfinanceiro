'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BasicInfoStep } from '@/components/onboarding/BasicInfoStep'
import { HouseholdTypeStep } from '@/components/onboarding/HouseholdTypeStep'
import { MembersStep } from '@/components/onboarding/MembersStep'
import { GoalsStep } from '@/components/onboarding/GoalsStep'
import { LoadingStep } from '@/components/onboarding/LoadingStep'
import { toast } from 'sonner'

export type HouseholdType = 'individual' | 'couple' | 'family'

export interface OnboardingData {
  // Etapa 1: Informações Básicas
  familyName: string
  userName: string
  userEmail: string
  userPhone: string

  // Etapa 2: Tipo de Household
  householdType: HouseholdType

  // Etapa 3: Membros (se couple ou family)
  members: Array<{
    name: string
    email: string
    phone: string
    role: 'spouse' | 'child' | 'member'
  }>

  // Etapa 4: Metas
  primaryGoal: string
  goalDescription: string
}

const STEPS = [
  { id: 1, name: 'Informações Básicas' },
  { id: 2, name: 'Tipo de Gestão' },
  { id: 3, name: 'Membros' }, // Condicional
  { id: 4, name: 'Metas' },
  { id: 5, name: 'Finalização' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

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

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    // Se for individual, pula etapa de membros
    if (currentStep === 2 && formData.householdType === 'individual') {
      setCurrentStep(4)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    // Se for individual, volta direto da meta para tipo
    if (currentStep === 4 && formData.householdType === 'individual') {
      setCurrentStep(2)
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }

  const completeOnboarding = async () => {
    setIsLoading(true)
    setCurrentStep(5) // Mostrar loading

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // 1. Buscar household do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('household_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      // 2. Atualizar household
      const { error: householdError } = await supabase
        .from('households')
        .update({
          family_name: formData.familyName,
          household_type: formData.householdType,
          primary_goal: formData.primaryGoal,
          goal_description: formData.goalDescription,
          onboarding_completed: true,
        })
        .eq('id', userData.household_id)

      if (householdError) throw householdError

      // 3. Criar convites para membros (se houver)
      if (formData.members.length > 0) {
        const membersToInsert = formData.members.map(member => ({
          household_id: userData.household_id,
          user_id: null, // Será preenchido quando aceitar
          role: member.role,
          name: member.name,
          email: member.email,
          phone: member.phone,
          invitation_status: 'pending',
          can_manage_members: member.role === 'spouse',
          can_manage_finances: true,
        }))

        const { error: membersError } = await supabase
          .from('household_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      // 4. Atualizar dados do onboarding
      const { error: onboardingError } = await supabase
        .from('onboarding_data')
        .update({
          step_basic_info: true,
          step_household_type: true,
          step_members: true,
          step_goals: true,
          step_completed: true,
          completed_at: new Date().toISOString(),
          data: formData,
        })
        .eq('household_id', userData.household_id)

      if (onboardingError) throw onboardingError

      // Aguardar um pouco para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success('Onboarding concluído com sucesso!')
      router.push('/dashboard')

    } catch (error: any) {
      console.error('Erro no onboarding:', error)
      toast.error(error.message || 'Erro ao finalizar onboarding')
      setCurrentStep(4) // Voltar para a última etapa
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f0f0f] dark:to-[#1a1a1a]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="GLX"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bem-vindo ao GLX
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Vamos configurar sua gestão financeira em alguns passos
          </p>
        </div>

        {/* Progress Bar */}
        {currentStep < 5 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {STEPS.filter(step => {
                // Ocultar etapa de membros se for individual
                if (step.id === 3 && formData.householdType === 'individual') {
                  return false
                }
                return step.id <= 4 // Não mostrar finalização na barra
              }).map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${
                    index > 0 ? 'flex-1' : ''
                  }`}
                >
                  {index > 0 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step.id - 1
                          ? 'bg-[#D4C5B9]'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-[#D4C5B9] text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.id}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
              {STEPS.filter(step => {
                if (step.id === 3 && formData.householdType === 'individual') {
                  return false
                }
                return step.id <= 4
              }).map(step => (
                <span
                  key={step.id}
                  className={currentStep === step.id ? 'font-medium text-[#D4C5B9]' : ''}
                >
                  {step.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl p-8">
          {currentStep === 1 && (
            <BasicInfoStep
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
            />
          )}

          {currentStep === 2 && (
            <HouseholdTypeStep
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && (
            <MembersStep
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <GoalsStep
              data={formData}
              onUpdate={updateFormData}
              onComplete={completeOnboarding}
              onBack={prevStep}
            />
          )}

          {currentStep === 5 && (
            <LoadingStep />
          )}
        </div>
      </div>
    </div>
  )
}
