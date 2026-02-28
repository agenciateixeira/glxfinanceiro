'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react'

export const ResetPasswordForm = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um email válido')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (resetError) {
        setError('Erro ao enviar email. Tente novamente.')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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

          {/* Success Message */}
          <div className="w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Email enviado!</h1>
              <p className="text-muted-foreground text-sm">
                Enviamos um link para redefinir sua senha para <strong>{email}</strong>.
                Verifique sua caixa de entrada e spam.
              </p>
            </div>

            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full h-12"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar para o login
            </Button>
          </div>
        </div>
      </div>
    )
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
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Redefinir senha</h1>
            <p className="text-muted-foreground text-sm">
              Digite seu email e enviaremos um link para redefinir sua senha
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Input
              id="email"
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="h-12 text-base sm:text-lg"
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-12"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Enviar link
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          {/* Links */}
          <div className="flex flex-col items-center space-y-3 pt-4 text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
