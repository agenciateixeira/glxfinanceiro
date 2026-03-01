'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Period = '7d' | '15d' | '30d' | '90d' | 'all'

interface PeriodFilterProps {
  value: Period
  onChange: (period: Period) => void
}

const PERIOD_OPTIONS = [
  { value: '7d' as Period, label: 'Últimos 7 dias' },
  { value: '15d' as Period, label: 'Últimos 15 dias' },
  { value: '30d' as Period, label: 'Últimos 30 dias' },
  { value: '90d' as Period, label: 'Últimos 90 dias' },
  { value: 'all' as Period, label: 'Todos' }
]

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (period: Period) => {
    onChange(period)
    setIsOpen(false)
  }

  const getCurrentLabel = () => {
    return PERIOD_OPTIONS.find(opt => opt.value === value)?.label || 'Período'
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600"
        title={getCurrentLabel()}
      >
        <Calendar className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg shadow-lg z-50 py-1 animate-in slide-in-from-top-2 duration-200"
        >
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center justify-between transition-colors ${
                value === option.value
                  ? 'text-[#D4C5B9] font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4 text-[#D4C5B9]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
