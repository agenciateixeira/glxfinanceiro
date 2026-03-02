declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface PWAConfig {
    dest?: string
    disable?: boolean
    register?: boolean
    skipWaiting?: boolean
    [key: string]: any
  }

  function withPWA(pwaConfig: PWAConfig): (config: NextConfig) => NextConfig
  export default withPWA
}
