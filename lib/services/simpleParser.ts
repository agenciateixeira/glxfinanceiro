/**
 * Parser Simplificado - Apenas extrai dados brutos
 * Não tenta classificar tipo ou categoria
 * O usuário vai classificar e o sistema aprende
 */

import Papa from 'papaparse'

export interface RawTransaction {
  date: string // YYYY-MM-DD
  description: string
  amount: number // Sempre positivo
  raw_type?: 'positive' | 'negative' // Do arquivo original (se houver sinal)
}

export interface SimpleParseResult {
  transactions: RawTransaction[]
  format: 'csv' | 'pdf' | 'unknown'
  errors: string[]
}

/**
 * Normaliza data para YYYY-MM-DD
 */
function normalizeDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0]

  const str = String(value).trim()

  // DD/MM/YYYY ou DD/MM/YY
  const ddmmyyyy = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    const fullYear = year.length === 2 ? `20${year}` : year
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YYYY-MM-DD
  const yyyymmdd = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Tenta parsear como data
  const date = new Date(str)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return new Date().toISOString().split('T')[0]
}

/**
 * Normaliza valor monetário
 */
function normalizeAmount(value: any): { amount: number; wasNegative: boolean } {
  if (typeof value === 'number') {
    return { amount: Math.abs(value), wasNegative: value < 0 }
  }

  const str = String(value).trim()
  const wasNegative = str.startsWith('-')

  const cleaned = str
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = parseFloat(cleaned) || 0
  return { amount: Math.abs(parsed), wasNegative: wasNegative || parsed < 0 }
}

/**
 * Detecta colunas automaticamente
 */
function detectColumns(headers: string[]) {
  const normalized = headers.map(h => h.toLowerCase().trim())

  return {
    date: normalized.findIndex(h =>
      h.includes('data') || h.includes('date') || h === 'dia'
    ),
    description: normalized.findIndex(h =>
      h.includes('descri') || h.includes('descrição') ||
      h.includes('historico') || h.includes('histórico') ||
      h.includes('detalhe') || h.includes('description') ||
      h.includes('estabelecimento') || h.includes('comercio')
    ),
    amount: normalized.findIndex(h =>
      h.includes('valor') || h.includes('amount') ||
      h.includes('total') || h.includes('transacao') || h.includes('transação')
    )
  }
}

/**
 * Parse CSV - extrai apenas dados brutos
 */
export function parseCSV(text: string): RawTransaction[] {
  // Tenta com vírgula
  let result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    dynamicTyping: false
  })

  // Se falhar, tenta com ponto e vírgula
  if (!result.data || result.data.length === 0) {
    result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      dynamicTyping: false
    })
  }

  if (!result.data || result.data.length === 0) {
    return []
  }

  const rows = result.data as any[]
  const headers = Object.keys(rows[0])
  const columns = detectColumns(headers)

  if (columns.date === -1 || columns.amount === -1) {
    console.error('[SimpleParser] Could not detect required columns')
    return []
  }

  return rows
    .filter(row => {
      const amountValue = row[headers[columns.amount]]
      if (!amountValue) return false

      const { amount } = normalizeAmount(amountValue)
      return amount > 0
    })
    .map(row => {
      const date = normalizeDate(row[headers[columns.date]])

      // Descrição
      let description = 'Transação'
      if (columns.description >= 0) {
        description = String(row[headers[columns.description]] || 'Transação').trim()
      }

      // Valor
      const amountValue = row[headers[columns.amount]]
      const { amount, wasNegative } = normalizeAmount(amountValue)

      return {
        date,
        description,
        amount,
        raw_type: wasNegative ? 'negative' : 'positive'
      }
    })
}

/**
 * Parse PDF - extração super simples
 * Apenas pega qualquer linha que tem um valor em reais
 */
export function parsePDF(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []

  // Pattern GENÉRICO: captura qualquer coisa seguida de valor
  // Ex: "Compra no débito PADARIA 23,80"
  // Ex: "Transferência recebida ... 60,00"
  const pattern = /([^\d\n]{10,}?)\s+([\d.]+,\d{2})/g

  // Extrai datas do contexto (DD/MM/YYYY ou DD MMM YYYY)
  const datePattern = /(\d{1,2})\s+(?:\/\s*(\d{1,2})\s*\/\s*(\d{4})|([A-Z]{3})\s+(\d{4}))/gi
  const dates: { index: number; date: string }[] = []

  const MONTH_MAP: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  }

  let dateMatch: RegExpExecArray | null
  while ((dateMatch = datePattern.exec(text)) !== null) {
    let formattedDate: string

    if (dateMatch[2]) {
      // DD/MM/YYYY
      const day = dateMatch[1]
      const month = dateMatch[2]
      const year = dateMatch[3]
      formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    } else if (dateMatch[4]) {
      // DD MMM YYYY
      const day = dateMatch[1]
      const month = MONTH_MAP[dateMatch[4].toUpperCase()]
      const year = dateMatch[5]
      if (month) {
        formattedDate = `${year}-${month}-${day.padStart(2, '0')}`
      } else {
        continue
      }
    } else {
      continue
    }

    dates.push({ index: dateMatch.index, date: formattedDate })
  }

  // Extrai transações
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const description = match[1].trim()
    const amountStr = match[2]

    // Ignora linhas de totais e saldos
    if (description.toLowerCase().includes('total de') ||
        description.toLowerCase().includes('saldo') ||
        description.length < 5) {
      continue
    }

    const { amount } = normalizeAmount(amountStr)
    if (amount === 0) continue

    // Encontra data mais próxima
    let transactionDate = dates[0]?.date || new Date().toISOString().split('T')[0]
    for (const dateInfo of dates) {
      if (dateInfo.index < match.index) {
        transactionDate = dateInfo.date
      } else {
        break
      }
    }

    transactions.push({
      date: transactionDate,
      description: description.substring(0, 200), // Limita tamanho
      amount
    })
  }

  return transactions
}

/**
 * Parser Universal - detecta formato e extrai
 */
export function parseSimple(content: string | Buffer, filename: string): SimpleParseResult {
  const text = content instanceof Buffer ? content.toString('utf-8') : content
  const errors: string[] = []
  let transactions: RawTransaction[] = []
  let format: SimpleParseResult['format'] = 'unknown'

  try {
    // Tenta CSV primeiro
    if (filename.endsWith('.csv') || text.includes(',')) {
      transactions = parseCSV(text)
      if (transactions.length > 0) {
        format = 'csv'
      }
    }

    // Se não funcionou, tenta PDF
    if (transactions.length === 0 && (filename.endsWith('.pdf') || !filename.endsWith('.csv'))) {
      transactions = parsePDF(text)
      if (transactions.length > 0) {
        format = 'pdf'
      }
    }

    if (transactions.length === 0) {
      errors.push('Nenhuma transação encontrada no arquivo')
    }
  } catch (error) {
    errors.push(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }

  return {
    transactions,
    format,
    errors
  }
}
