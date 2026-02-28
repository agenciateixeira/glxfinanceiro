'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  FolderOpen,
  Settings,
  User,
  LogOut,
  Bell,
  ChevronDown,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Categorias', href: '/categories', icon: FolderOpen },
  { name: 'Metas', href: '/goals', icon: Target },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const supabase = createClient()

  // Buscar nome do usuário
  useEffect(() => {
    async function fetchUserName() {
      if (!user?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (data?.full_name) {
        setUserName(data.full_name)
      }
    }

    fetchUserName()
  }, [user?.id])

  // Pegar iniciais do nome do usuário
  const getInitials = () => {
    if (userName) {
      const names = userName.split(' ')
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
      }
      return userName.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  // Pegar primeiro nome
  const getFirstName = () => {
    if (userName) {
      return userName.split(' ')[0]
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Usuário'
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-[#2a2a2a] transition-colors">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-[#2a2a2a]">
        <Link href="/dashboard">
          <Image
            src="/logo.png"
            alt="GLX"
            width={40}
            height={40}
            className="w-10 h-10 object-contain hover:scale-110 transition-transform duration-200"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 font-medium
                ${
                  isActive
                    ? 'bg-[#D4C5B9] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-[#E8DDD2] dark:hover:bg-[#2a2a2a] hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col px-4 py-4 space-y-2 border-t border-gray-200 dark:border-[#2a2a2a]">
        {/* Notificações */}
        <button
          className="group flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {/* Badge de notificações */}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <span className="text-sm font-medium">Notificações</span>
        </button>

        {/* Theme Toggle */}
        <div className="flex items-center gap-3 px-4 py-3">
          <ThemeToggle />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4C5B9] to-[#B4A5A5] text-white hover:shadow-lg transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold">{getInitials()}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{getFirstName()}</p>
              <p className="text-xs opacity-90">Minha Conta</p>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-gray-200 dark:border-[#2a2a2a] py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a2a]">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userName || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Perfil
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false)
                      signOut()
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
