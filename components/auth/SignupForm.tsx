'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'

type Step = 'name' | 'email' | 'phone' | 'password' | 'ready'

export const SignupForm = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('name')
  const router = useRouter()
  const supabase = createClient()

  const handleNameSubmit = () => {
    if (!name.trim() || name.length < 3) {
      setError('Por favor, insira seu nome completo')
      return
    }
    setError('')
    setStep('email')
  }

  const handleEmailSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um email válido')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido')
      return
    }

    setError('')
    setStep('phone')
  }

  const handlePhoneSubmit = () => {
    if (!phone.trim()) {
      setError('Por favor, insira seu telefone')
      return
    }
    setError('')
    setStep('password')
  }

  const handlePasswordInput = (value: string) => {
    setPassword(value)
    if (value.length >= 6) {
      setStep('ready')
    } else if (step === 'ready') {
      setStep('password')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Criar conta no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          },
        },
      })

      if (signUpError) {
        // Traduzir mensagens de erro comuns
        let errorMessage = signUpError.message || 'Erro ao criar conta'

        if (signUpError.message?.includes('already registered') ||
            signUpError.message?.includes('already exists') ||
            signUpError.message?.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Faça login ou recupere sua senha.'
        } else if (signUpError.message?.includes('invalid email')) {
          errorMessage = 'Email inválido. Verifique e tente novamente.'
        } else if (signUpError.message?.includes('password')) {
          errorMessage = 'Senha inválida. Use no mínimo 6 caracteres.'
        }

        setError(errorMessage)
        setLoading(false)
        return
      }

      // Cadastro bem-sucedido - redirecionar
      // Usar setTimeout para garantir que a sessão foi salva nos cookies
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (err: any) {
      setError('Erro ao criar conta. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex flex-col items-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center pt-8 sm:pt-12">
          <Image
            src="/logo.png"
            alt="GLX"
            width={100}
            height={100}
            className="object-contain w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
            priority
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Nome Input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && step === 'name') {
                    e.preventDefault()
                    handleNameSubmit()
                  }
                }}
                disabled={loading || step !== 'name'}
                autoComplete="name"
                className="h-12 text-base sm:text-lg pr-10"
                autoFocus={step === 'name'}
              />
              {step !== 'name' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              )}
            </div>
            {step === 'name' && (
              <Button
                type="button"
                onClick={handleNameSubmit}
                disabled={loading || !name}
                className="w-full h-12"
                size="lg"
              >
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Email Input */}
          {step !== 'name' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && step === 'email') {
                      e.preventDefault()
                      handleEmailSubmit()
                    }
                  }}
                  disabled={loading || step !== 'email'}
                  autoComplete="email"
                  className="h-12 text-base sm:text-lg pr-10"
                  autoFocus={step === 'email'}
                />
                {(step === 'phone' || step === 'password' || step === 'ready') && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                )}
              </div>
              {step === 'email' && (
                <Button
                  type="button"
                  onClick={handleEmailSubmit}
                  disabled={loading || !email}
                  className="w-full h-12"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Telefone Input */}
          {(step === 'phone' || step === 'password' || step === 'ready') && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Digite seu telefone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && step === 'phone') {
                      e.preventDefault()
                      handlePhoneSubmit()
                    }
                  }}
                  disabled={loading || step !== 'phone'}
                  autoComplete="tel"
                  className="h-12 text-base sm:text-lg pr-10"
                  autoFocus={step === 'phone'}
                />
                {step !== 'phone' && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                )}
              </div>
              {step === 'phone' && (
                <Button
                  type="button"
                  onClick={handlePhoneSubmit}
                  disabled={loading || !phone}
                  className="w-full h-12"
                  size="lg"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Senha Input */}
          {(step === 'password' || step === 'ready') && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => handlePasswordInput(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="h-12 text-base sm:text-lg"
                autoFocus={step === 'password'}
              />
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-muted-foreground">
                  A senha deve ter no mínimo 6 caracteres
                </p>
              )}
            </div>
          )}

          {/* Criar Conta Button */}
          {step === 'ready' && (
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 animate-in fade-in slide-in-from-bottom-4 duration-300"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Criar Conta'
              )}
            </Button>
          )}

          {/* Links */}
          <div className="flex flex-col items-center space-y-3 pt-4 text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tem uma conta? <span className="font-medium">Entrar</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
