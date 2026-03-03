import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BasicInfoStepProps {
  familyName: string
  userName: string
  userEmail: string
  userPhone: string
  onUpdate: (field: string, value: string) => void
}

export function BasicInfoStep({
  familyName,
  userName,
  userEmail,
  userPhone,
  onUpdate,
}: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo ao GLX!
        </h2>
        <p className="text-gray-600">
          Vamos começar conhecendo você e sua família
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="familyName" className="text-base font-medium">
            Nome da Família *
          </Label>
          <Input
            id="familyName"
            placeholder="Ex: Família Silva"
            value={familyName}
            onChange={(e) => onUpdate('familyName', e.target.value)}
            className="h-12 text-base"
            required
          />
          <p className="text-sm text-gray-500">
            Como você gostaria de chamar seu grupo familiar?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="userName" className="text-base font-medium">
            Seu Nome Completo *
          </Label>
          <Input
            id="userName"
            placeholder="Ex: João Silva"
            value={userName}
            onChange={(e) => onUpdate('userName', e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userEmail" className="text-base font-medium">
            Seu E-mail *
          </Label>
          <Input
            id="userEmail"
            type="email"
            placeholder="seu@email.com"
            value={userEmail}
            onChange={(e) => onUpdate('userEmail', e.target.value)}
            className="h-12 text-base"
            required
            disabled
          />
          <p className="text-sm text-gray-500">
            E-mail já confirmado na criação da conta
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="userPhone" className="text-base font-medium">
            Seu Telefone (opcional)
          </Label>
          <Input
            id="userPhone"
            type="tel"
            placeholder="(11) 99999-9999"
            value={userPhone}
            onChange={(e) => onUpdate('userPhone', e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>
    </div>
  )
}
