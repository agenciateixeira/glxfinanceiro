'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2, ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react'

type Step = 'email' | 'password' | 'ready'

export const LoginForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const checkEmail = async () => {
    if (!email) {
      setError('Por favor, insira seu email')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido')
      return
    }

    setError('')
    setStep('password')
  }

  const handlePasswordInput = (value: string) => {
    setPassword(value)
    if (value.length >= 6) {
      setStep('ready')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Email ou senha incorretos')
        setLoading(false)
        return
      }

      // Login bem-sucedido - redirecionar
      // Usar setTimeout para garantir que a sessão foi salva nos cookies
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (err: any) {
      setError('Erro ao fazer login. Tente novamente.')
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

          {/* Indicador de Progresso */}
          {step !== 'email' && (
            <div className="flex gap-2 justify-center">
              <div className="h-1 w-16 bg-primary rounded-full"></div>
              <div className={`h-1 w-16 rounded-full transition-colors duration-300 ${step === 'ready' ? 'bg-primary' : 'bg-muted'}`}></div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && step === 'email') {
                    e.preventDefault()
                    checkEmail()
                  }
                }}
                disabled={loading || step !== 'email'}
                autoComplete="email"
                className="h-14 text-base sm:text-lg pl-11 pr-4 transition-all duration-200"
                autoFocus
              />
            </div>
            {step === 'email' && (
              <Button
                type="button"
                onClick={checkEmail}
                disabled={loading || !email}
                className="w-full h-14 text-base font-medium transition-all duration-200"
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

          {/* Password Input - Só aparece após email validado */}
          {step !== 'email' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => handlePasswordInput(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-14 text-base sm:text-lg pl-11 pr-11 transition-all duration-200"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                  A senha deve ter no mínimo 6 caracteres
                </p>
              )}
            </div>
          )}

          {/* Login Button - Só aparece após senha ter 6+ caracteres */}
          {step === 'ready' && (
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-base font-medium animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          )}
        </form>

        {/* Links - Movidos para fora do form */}
        <div className="flex flex-col items-center space-y-3 pt-4 text-sm w-full">
          <a
            href="/signup"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Não tem uma conta? <span className="font-medium">Criar conta</span>
          </a>
          <a
            href="/reset-password"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Esqueceu sua senha?
          </a>
        </div>
      </div>
    </div>
  )
}
