interface MoneyIconProps {
  className?: string
  variant?: 'bill' | 'coin' | 'stack' | 'hand' | 'wallet' | 'cards'
}

export function MoneyIcon({ className = "w-6 h-6", variant = 'bill' }: MoneyIconProps) {
  const variants = {
    // Nota de dinheiro (cédula)
    bill: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 12h.01" />
        <path d="M18 12h.01" />
      </svg>
    ),

    // Moeda
    coin: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v12" />
        <path d="M15 9.5c-.5-1-1.5-1.5-3-1.5s-2.5.5-3 1.5" />
        <path d="M9 14.5c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5" />
      </svg>
    ),

    // Pilha de dinheiro
    stack: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <rect x="2" y="4" width="20" height="4" rx="1" />
        <rect x="2" y="10" width="20" height="4" rx="1" />
        <rect x="2" y="16" width="20" height="4" rx="1" />
        <circle cx="12" cy="6" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),

    // Mão segurando dinheiro
    hand: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M12 2v20" />
        <path d="M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        <path d="M3 12h18" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),

    // Carteira
    wallet: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
        <path d="M16 20h6" />
        <path d="M16 16a2 2 0 0 1 2-2h4v6h-4a2 2 0 0 1-2-2z" />
        <circle cx="18.5" cy="18" r="0.5" fill="currentColor" />
      </svg>
    ),

    // Múltiplos cartões
    cards: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M7 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
  }

  return variants[variant] || variants.bill
}

// Exportar variantes individuais para uso direto
export const BillIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="bill" />
)

export const CoinIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="coin" />
)

export const StackIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="stack" />
)

export const HandMoneyIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="hand" />
)

export const WalletIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="wallet" />
)

export const CardsIcon = (props: Omit<MoneyIconProps, 'variant'>) => (
  <MoneyIcon {...props} variant="cards" />
)
