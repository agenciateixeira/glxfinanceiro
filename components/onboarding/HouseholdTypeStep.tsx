import { Users, Heart, User } from 'lucide-react'

export type HouseholdType = 'individual' | 'couple' | 'family'

interface HouseholdTypeStepProps {
  selectedType: HouseholdType
  onSelect: (type: HouseholdType) => void
}

export function HouseholdTypeStep({ selectedType, onSelect }: HouseholdTypeStepProps) {
  const options = [
    {
      type: 'individual' as HouseholdType,
      icon: User,
      title: 'Sozinho(a)',
      description: 'Vou gerenciar minhas finanças pessoais',
      color: 'bg-blue-500',
    },
    {
      type: 'couple' as HouseholdType,
      icon: Heart,
      title: 'Casal',
      description: 'Vou compartilhar finanças com meu/minha parceiro(a)',
      color: 'bg-pink-500',
    },
    {
      type: 'family' as HouseholdType,
      icon: Users,
      title: 'Família',
      description: 'Vou gerenciar finanças com múltiplos membros',
      color: 'bg-green-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Como você vai usar o GLX?
        </h2>
        <p className="text-gray-600">
          Escolha a opção que melhor se encaixa na sua situação
        </p>
      </div>

      <div className="grid gap-4">
        {options.map((option) => {
          const Icon = option.icon
          const isSelected = selectedType === option.type

          return (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className={`
                relative p-6 rounded-2xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? 'border-[#D4C5B9] bg-[#D4C5B9]/10 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`
                  ${option.color}
                  p-3 rounded-xl text-white shrink-0
                `}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-gray-600">{option.description}</p>
                </div>

                {isSelected && (
                  <div className="shrink-0">
                    <div className="w-6 h-6 rounded-full bg-[#D4C5B9] flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
