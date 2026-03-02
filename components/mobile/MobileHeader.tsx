'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  onMenuClick?: () => void
  onSearchClick?: () => void
  onFilterClick?: () => void
  showSearch?: boolean
  showFilter?: boolean
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Início',
  '/transactions': 'Transações',
  '/reports': 'Relatórios',
  '/goals': 'Metas',
  '/accounts': 'Contas',
  '/categories': 'Categorias',
  '/settings': 'Configurações',
}

export function MobileHeader({
  onMenuClick,
  onSearchClick,
  onFilterClick,
  showSearch = false,
  showFilter = false,
}: MobileHeaderProps) {
  const pathname = usePathname()

  // Não mostrar na página de login/signup
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return null
  }

  const pageTitle = PAGE_TITLES[pathname] || 'GLX'

  return (
    <header className="fixed top-0 left-0 right-0 z-40 md:hidden bg-background/80 backdrop-blur-lg border-b border-border">
      <div
        className="flex items-center justify-between h-14 px-4 pt-safe"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        }}
      >
        {/* Left side - Logo */}
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="GLX"
            className="w-8 h-8 object-contain"
          />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <button
              onClick={onSearchClick}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "hover:bg-accent/50 transition-colors tap-target",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {showFilter && (
            <button
              onClick={onFilterClick}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "hover:bg-accent/50 transition-colors tap-target",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Filtrar"
            >
              <Filter className="h-5 w-5" />
            </button>
          )}

          <button
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center relative",
              "hover:bg-accent/50 transition-colors tap-target",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {/* Badge de notificações */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "hover:bg-accent/50 transition-colors tap-target",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
