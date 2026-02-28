'use client'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { ThemeToggle } from '@/components/auth/ThemeToggle'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0EB] dark:bg-background p-4 relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
