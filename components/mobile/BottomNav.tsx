'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Receipt, PieChart, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  activePattern?: RegExp
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Início',
    icon: Home,
    activePattern: /^\/(dashboard)?$/
  },
  {
    href: '/transactions',
    label: 'Transações',
    icon: Receipt,
    activePattern: /^\/transactions/
  },
  {
    href: '/reports',
    label: 'Relatórios',
    icon: PieChart,
    activePattern: /^\/reports/
  },
  {
    href: '/settings',
    label: 'Perfil',
    icon: Settings,
    activePattern: /^\/settings/
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Não mostra na página de login/signup
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return null
  }

  const isActive = (item: NavItem) => {
    if (item.activePattern) {
      return item.activePattern.test(pathname)
    }
    return pathname === item.href
  }

  const handleNavClick = (href: string) => {
    // Haptic feedback (apenas funciona em iOS Safari/Chrome)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    router.push(href)
  }

  const handleFABClick = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 5, 10])
    }
    router.push('/transactions?action=new')
  }

  return (
    <>
      {/* Safe area spacer */}
      <div className="h-20 md:hidden" />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-2 relative">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all",
                  "hover:bg-accent/50 rounded-lg",
                  index === 1 && "mr-16", // Espaço para o FAB
                  active && "text-primary",
                  !active && "text-muted-foreground"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-all",
                  active && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-all",
                  active && "font-semibold"
                )}>
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* FAB - Floating Action Button */}
          <button
            onClick={handleFABClick}
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            aria-label="Nova transação"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Safe area for iOS devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>
    </>
  )
}
