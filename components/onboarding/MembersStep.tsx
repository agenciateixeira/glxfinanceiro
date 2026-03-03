import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { HouseholdType } from './HouseholdTypeStep'

export interface Member {
  id: string
  name: string
  email: string
  phone: string
  role: 'spouse' | 'child' | 'member'
}

interface MembersStepProps {
  householdType: HouseholdType
  members: Member[]
  onUpdate: (members: Member[]) => void
}

export function MembersStep({ householdType, members, onUpdate }: MembersStepProps) {
  const addMember = () => {
    const newMember: Member = {
      id: Date.now().toString(),
      name: '',
      email: '',
      phone: '',
      role: householdType === 'couple' ? 'spouse' : 'member',
    }
    onUpdate([...members, newMember])
  }

  const removeMember = (id: string) => {
    onUpdate(members.filter((m) => m.id !== id))
  }

  const updateMember = (id: string, field: keyof Member, value: string) => {
    onUpdate(
      members.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    )
  }

  const getTitleAndDescription = () => {
    if (householdType === 'couple') {
      return {
        title: 'Adicione seu/sua parceiro(a)',
        description: 'Informe os dados do seu cônjuge para compartilhar as finanças',
      }
    }
    return {
      title: 'Adicione os membros da família',
      description: 'Informe quantos membros deseja adicionar e os dados de cada um',
    }
  }

  const { title, description } = getTitleAndDescription()

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <div className="space-y-4">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="p-6 border-2 border-gray-200 rounded-xl bg-gray-50 space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">
                {householdType === 'couple'
                  ? 'Cônjuge'
                  : `Membro ${index + 1}`}
              </h3>
              {(householdType === 'family' || members.length > 1) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember(member.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${member.id}`}>Nome Completo *</Label>
                <Input
                  id={`name-${member.id}`}
                  placeholder="Ex: Maria Silva"
                  value={member.name}
                  onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`email-${member.id}`}>E-mail *</Label>
                <Input
                  id={`email-${member.id}`}
                  type="email"
                  placeholder="email@exemplo.com"
                  value={member.email}
                  onChange={(e) => updateMember(member.id, 'email', e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  Um convite será enviado para este e-mail
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`phone-${member.id}`}>Telefone (opcional)</Label>
                <Input
                  id={`phone-${member.id}`}
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={member.phone}
                  onChange={(e) => updateMember(member.id, 'phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        {householdType === 'family' && (
          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-[#D4C5B9] hover:bg-[#D4C5B9]/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar mais um membro
          </Button>
        )}

        {members.length === 0 && householdType === 'couple' && (
          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full h-12 border-2 border-[#D4C5B9] bg-[#D4C5B9]/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar cônjuge
          </Button>
        )}

        {members.length === 0 && householdType === 'family' && (
          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full h-12 border-2 border-[#D4C5B9] bg-[#D4C5B9]/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar primeiro membro
          </Button>
        )}
      </div>
    </div>
  )
}
