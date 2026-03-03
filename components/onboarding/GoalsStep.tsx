import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Target, TrendingUp, PiggyBank, Home, Car, Plane } from 'lucide-react'

interface GoalsStepProps {
  primaryGoal: string
  goalDescription: string
  onUpdate: (field: string, value: string) => void
}

export function GoalsStep({ primaryGoal, goalDescription, onUpdate }: GoalsStepProps) {
  const goalOptions = [
    {
      id: 'save',
      icon: PiggyBank,
      title: 'Economizar Dinheiro',
      description: 'Guardar para emergências ou objetivos futuros',
      color: 'bg-green-500',
    },
    {
      id: 'invest',
      icon: TrendingUp,
      title: 'Investir Melhor',
      description: 'Fazer meu dinheiro render mais',
      color: 'bg-blue-500',
    },
    {
      id: 'organize',
      icon: Target,
      title: 'Organizar Finanças',
      description: 'Ter controle de receitas e despesas',
      color: 'bg-purple-500',
    },
    {
      id: 'buy_house',
      icon: Home,
      title: 'Comprar Casa',
      description: 'Juntar dinheiro para a casa própria',
      color: 'bg-orange-500',
    },
    {
      id: 'buy_car',
      icon: Car,
      title: 'Comprar Carro',
      description: 'Economizar para um veículo',
      color: 'bg-red-500',
    },
    {
      id: 'travel',
      icon: Plane,
      title: 'Viajar',
      description: 'Realizar viagens dos sonhos',
      color: 'bg-cyan-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Qual é sua meta principal?
        </h2>
        <p className="text-gray-600">
          Isso nos ajudará a personalizar sua experiência no GLX
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goalOptions.map((option) => {
          const Icon = option.icon
          const isSelected = primaryGoal === option.id

          return (
            <button
              key={option.id}
              onClick={() => onUpdate('primaryGoal', option.id)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${
                  isSelected
                    ? 'border-[#D4C5B9] bg-[#D4C5B9]/10 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col gap-3">
                <div
                  className={`
                  ${option.color}
                  w-12 h-12 rounded-lg flex items-center justify-center text-white
                `}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-tight">
                    {option.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="flex justify-end">
                    <div className="w-5 h-5 rounded-full bg-[#D4C5B9] flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
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

      <div className="space-y-3 pt-4">
        <Label htmlFor="goalDescription" className="text-base font-medium">
          Conte-nos mais sobre sua meta (opcional)
        </Label>
        <Textarea
          id="goalDescription"
          placeholder="Ex: Quero juntar R$ 50.000 para dar entrada na casa própria até o final do ano..."
          value={goalDescription}
          onChange={(e) => onUpdate('goalDescription', e.target.value)}
          rows={4}
          className="text-base resize-none"
        />
        <p className="text-sm text-gray-500">
          Quanto mais detalhes você fornecer, melhor poderemos ajudá-lo
        </p>
      </div>
    </div>
  )
}
