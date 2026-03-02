'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Receipt, Target, Menu, X, Wallet, FolderOpen, RefreshCw, Settings, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  activePattern?: RegExp
}

const BOTTOM_NAV_ITEMS: NavItem[] = [
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
    href: '/goals',
    label: 'Metas',
    icon: Target,
    activePattern: /^\/goals/
  },
]

interface MenuSection {
  title: string
  items: NavItem[]
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Financeiro',
    items: [
      { href: '/accounts', label: 'Contas Bancárias', icon: Wallet },
      { href: '/categories', label: 'Categorias', icon: FolderOpen },
      { href: '/transactions/recurring-expenses', label: 'Gastos Fixos', icon: RefreshCw },
      { href: '/transactions/settings', label: 'Config. Financeiras', icon: Settings },
    ]
  },
  {
    title: 'Conta',
    items: [
      { href: '/profile', label: 'Meu Perfil', icon: User },
      { href: '/settings', label: 'Configurações', icon: Settings },
    ]
  }
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    router.push(href)
  }

  const handleMenuToggle = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    setIsMenuOpen(!isMenuOpen)
  }

  const handleMenuItemClick = (href: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    setIsMenuOpen(false)
    router.push(href)
  }

  const handleLogout = async () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 5, 10])
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Safe area spacer */}
      <div className="h-20 md:hidden" />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all tap-target",
                  "hover:bg-accent/50 rounded-lg",
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

          {/* Menu Button */}
          <button
            onClick={handleMenuToggle}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all tap-target",
              "hover:bg-accent/50 rounded-lg",
              isMenuOpen && "text-primary",
              !isMenuOpen && "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>

        {/* Safe area for iOS devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur-lg" />
      </nav>

      {/* Menu Drawer Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Menu Drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[70] md:hidden",
          "bg-background rounded-t-3xl border-t border-border",
          "transition-transform duration-300 ease-out",
          "max-h-[85vh] overflow-y-auto",
          isMenuOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)'
        }}
      >
        {/* Drawer Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/50 tap-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Sections */}
        <div className="px-4 py-2">
          {MENU_SECTIONS.map((section, sectionIdx) => (
            <div key={section.title} className={cn(sectionIdx > 0 && "mt-6")}>
              <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href

                  return (
                    <button
                      key={item.href}
                      onClick={() => handleMenuItemClick(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all tap-target",
                        "hover:bg-accent/50",
                        active && "bg-accent text-primary",
                        !active && "text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Logout Button */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all tap-target",
                "hover:bg-destructive/10 text-destructive"
              )}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
