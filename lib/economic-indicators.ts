/**
 * Serviço para buscar indicadores econômicos do Banco Central do Brasil
 * API: https://olindaapi.bcb.gov.br/
 */

interface BCBIndicator {
  data: string
  valor: string
}

/**
 * Códigos dos indicadores no BCB:
 * - CDI: 12 (Taxa de juros - CDI)
 * - SELIC: 11 (Taxa de juros - Selic)
 * - IPCA: 433 (IPCA - Variação mensal)
 */

export async function fetchCDI(startDate: string, endDate: string): Promise<BCBIndicator[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar CDI:', error)
    return []
  }
}

export async function fetchSelic(startDate: string, endDate: string): Promise<BCBIndicator[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar Selic:', error)
    return []
  }
}

export async function fetchIPCA(startDate: string, endDate: string): Promise<BCBIndicator[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar IPCA:', error)
    return []
  }
}

/**
 * Formata data para o padrão do BCB (DD/MM/YYYY)
 */
export function formatDateForBCB(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Busca todos os indicadores de uma vez
 */
export async function fetchAllIndicators(months: number = 12) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const startDateStr = formatDateForBCB(startDate)
  const endDateStr = formatDateForBCB(endDate)

  const [cdi, selic, ipca] = await Promise.all([
    fetchCDI(startDateStr, endDateStr),
    fetchSelic(startDateStr, endDateStr),
    fetchIPCA(startDateStr, endDateStr)
  ])

  return { cdi, selic, ipca }
}

/**
 * Calcula acumulado dos últimos 12 meses
 */
export function calculateAccumulated12M(rates: number[]): number {
  if (rates.length === 0) return 0

  // Pega os últimos 12 meses (ou menos se não houver)
  const last12 = rates.slice(-12)

  // Fórmula: ((1 + r1/100) * (1 + r2/100) * ... - 1) * 100
  const accumulated = last12.reduce((acc, rate) => {
    return acc * (1 + rate / 100)
  }, 1)

  return (accumulated - 1) * 100
}

/**
 * Converte dados do BCB para formato do nosso banco
 */
export function convertBCBDataToMonthly(data: BCBIndicator[]) {
  // Agrupa por mês (pega o último valor de cada mês)
  const byMonth: { [key: string]: number } = {}

  data.forEach(item => {
    // Data vem em DD/MM/YYYY
    const [day, month, year] = item.data.split('/')
    const monthKey = `${year}-${month}`
    byMonth[monthKey] = parseFloat(item.valor.replace(',', '.'))
  })

  return byMonth
}

/**
 * Calcula taxa de crescimento do patrimônio
 */
export function calculatePatrimonyGrowth(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return 0
  return ((currentValue - previousValue) / previousValue) * 100
}

/**
 * Determina se o desempenho está acima ou abaixo do benchmark
 */
export function compareToBenchmark(patrimonyGrowth: number, benchmark: number): {
  difference: number
  isAbove: boolean
  message: string
} {
  const difference = patrimonyGrowth - benchmark
  const isAbove = difference > 0

  let message = ''
  if (isAbove) {
    message = `Você está ${difference.toFixed(2)}% acima do ${benchmark === patrimonyGrowth ? 'CDI' : 'IPCA'}! 🎯`
  } else {
    message = `Você está ${Math.abs(difference).toFixed(2)}% abaixo do ${benchmark === patrimonyGrowth ? 'CDI' : 'IPCA'}. ⚠️`
  }

  return { difference, isAbove, message }
}

/**
 * Calcula patrimônio corrigido pela inflação
 */
export function adjustForInflation(nominalValue: number, inflationRate: number): number {
  return nominalValue / (1 + inflationRate / 100)
}
