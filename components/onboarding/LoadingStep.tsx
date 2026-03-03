import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface LoadingStepProps {
  isComplete: boolean
}

export function LoadingStep({ isComplete }: LoadingStepProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    'Criando sua família...',
    'Configurando permissões...',
    'Enviando convites...',
    'Preparando seu painel...',
    'Finalizando configuração...',
  ]

  useEffect(() => {
    if (isComplete) {
      setCurrentStep(steps.length)
      return
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 800)

    return () => clearInterval(interval)
  }, [isComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
      <div className="text-center space-y-4">
        {isComplete ? (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Tudo pronto!
            </h2>
            <p className="text-lg text-gray-600">
              Seu perfil foi criado com sucesso
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto">
              <Loader2 className="w-20 h-20 text-[#D4C5B9] animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Configurando tudo para você...
            </h2>
            <p className="text-lg text-gray-600">
              Isso só vai levar alguns segundos
            </p>
          </>
        )}
      </div>

      <div className="w-full max-w-md space-y-3">
        {steps.map((step, index) => {
          const isCurrentStep = index === currentStep && !isComplete
          const isDone = index < currentStep || isComplete

          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                ${isCurrentStep ? 'bg-[#D4C5B9]/20 scale-105' : ''}
              `}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : isCurrentStep ? (
                  <Loader2 className="w-5 h-5 text-[#D4C5B9] animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <span
                className={`
                  text-sm font-medium transition-colors
                  ${isDone ? 'text-green-600' : ''}
                  ${isCurrentStep ? 'text-[#D4C5B9]' : ''}
                  ${!isDone && !isCurrentStep ? 'text-gray-400' : ''}
                `}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>

      {isComplete && (
        <p className="text-sm text-gray-500 animate-pulse">
          Redirecionando para o painel...
        </p>
      )}
    </div>
  )
}
