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
  format: 'csv' | 'pdf' | 'ofx' | 'unknown'
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
 * Parse de data do PDF (formato DD MMM YYYY ou DD/MM/YYYY)
 */
function parseDateFromPDF(dateStr: string): string {
  const MONTH_MAP: Record<string, string> = {
    'JAN': '01', 'JANEIRO': '01',
    'FEB': '02', 'FEV': '02', 'FEVEREIRO': '02',
    'MAR': '03', 'MARÇO': '03', 'MARCO': '03',
    'APR': '04', 'ABR': '04', 'ABRIL': '04',
    'MAY': '05', 'MAI': '05', 'MAIO': '05',
    'JUN': '06', 'JUNHO': '06',
    'JUL': '07', 'JULHO': '07',
    'AUG': '08', 'AGO': '08', 'AGOSTO': '08',
    'SEP': '09', 'SET': '09', 'SETEMBRO': '09',
    'OCT': '10', 'OUT': '10', 'OUTUBRO': '10',
    'NOV': '11', 'NOVEMBRO': '11',
    'DEC': '12', 'DEZ': '12', 'DEZEMBRO': '12'
  }

  // DD MMM YYYY
  const match1 = dateStr.match(/(\d{1,2})\s+([A-Z]{3,})\s+(\d{4})/i)
  if (match1) {
    const day = match1[1].padStart(2, '0')
    const month = MONTH_MAP[match1[2].toUpperCase()] || '01'
    const year = match1[3]
    return `${year}-${month}-${day}`
  }

  // DD/MM/YYYY
  const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match2) {
    const day = match2[1].padStart(2, '0')
    const month = match2[2].padStart(2, '0')
    const year = match2[3]
    return `${year}-${month}-${day}`
  }

  return new Date().toISOString().split('T')[0]
}

/**
 * Parser específico para PDF do Nubank
 */
function parseNubankPDF(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []
  const lines = text.split('\n').map(l => l.trim())

  let currentDate: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detecta data: "03 JAN 2026"
    const dateMatch = line.match(/^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})$/i)
    if (dateMatch) {
      currentDate = parseDateFromPDF(line)
      continue
    }

    // Ignora totalizadores e títulos
    if (line.match(/^Total de (entradas|saídas)/i) ||
        line.match(/^[\+\-]\s*[\d.,]+$/) ||
        line.match(/^Movimentações$/i) ||
        line === '' ||
        line.match(/^\d+ de \d+$/)) {
      continue
    }

    // Detecta tipos de transação do Nubank
    const txTypes = [
      'Transferência recebida pelo Pix',
      'Transferência enviada pelo Pix',
      'Transferência Recebida',
      'Transferência enviada',
      'Compra no débito',
      'Compra no débito via NuPay',
      'Pagamento de fatura',
      'Reembolso recebido pelo Pix',
      'Recarga de celular',
      'Resgate de empréstimo',
      'Depósito de empréstimo',
      'Valor adicionado'
    ]

    // Tenta encontrar tipo de transação (pode ser início da linha ou estar contida)
    let txType: string | undefined
    for (const type of txTypes) {
      if (line.includes(type)) {
        txType = type
        break
      }
    }

    if (txType && currentDate) {
      let description = line
      let amount = 0
      let raw_type: 'positive' | 'negative' | undefined = undefined

      // Determina tipo baseado na descrição
      if (txType.includes('recebida') || txType.includes('Recebida') || txType.includes('Reembolso') || txType.includes('Depósito') || txType.includes('adicionado')) {
        raw_type = 'positive'
      } else {
        raw_type = 'negative'
      }

      // Busca valor nas próximas linhas (máximo 5 linhas à frente)
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextLine = lines[j]

        // Linha com apenas valor (formato: 60,00 ou 1.234,56)
        const valueMatch = nextLine.match(/^([\d.]+,\d{2})$/)
        if (valueMatch) {
          const amountStr = valueMatch[1].replace(/\./g, '').replace(',', '.')
          amount = parseFloat(amountStr)

          // Pega descrição completa (linhas entre a transação e o valor)
          const details: string[] = []
          for (let k = i + 1; k < j; k++) {
            const detailLine = lines[k]
            // Filtra linhas inúteis
            if (!detailLine.match(/Agência:|Conta:|\(\d{4}\)|CNPJ:|CPF:|^-/) &&
                detailLine.length > 0 &&
                detailLine.length < 150) {
              details.push(detailLine)
            }
          }

          if (details.length > 0) {
            description = `${txType} - ${details[0]}`
          }

          break
        }

        // Se encontrar outra transação ou data, para
        if (txTypes.some(t => nextLine.startsWith(t)) ||
            nextLine.match(/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/)) {
          break
        }
      }

      if (amount > 0) {
        transactions.push({
          date: currentDate,
          description: description.substring(0, 200),
          amount,
          raw_type
        })
      }
    }
  }

  return transactions
}

/**
 * Parser genérico para PDF
 */
function parseGenericPDF(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []
  const pattern = /([^\d\n]{10,}?)\s+([\d.]+,\d{2})/g

  const datePattern = /(\d{1,2})[\/\s](?:(\d{1,2})[\/\s](\d{4})|([A-Z]{3,})\s+(\d{4}))/gi
  const dates: { index: number; date: string }[] = []

  let dateMatch: RegExpExecArray | null
  while ((dateMatch = datePattern.exec(text)) !== null) {
    const parsedDate = parseDateFromPDF(dateMatch[0])
    dates.push({ index: dateMatch.index, date: parsedDate })
  }

  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const description = match[1].trim()
    const amountStr = match[2]

    if (description.toLowerCase().includes('total') ||
        description.toLowerCase().includes('saldo') ||
        description.length < 5) {
      continue
    }

    const { amount } = normalizeAmount(amountStr)
    if (amount === 0) continue

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
      description: description.substring(0, 200),
      amount
    })
  }

  return transactions
}

/**
 * Parse CSV do Nubank
 */
function parseNubankCSV(text: string): RawTransaction[] {
  const lines = text.split('\n')
  const transactions: RawTransaction[] = []

  for (const line of lines) {
    if (!line.trim() || line.includes('Data,Categoria')) continue

    const parts = line.split(',')
    if (parts.length < 3) continue

    const date = normalizeDate(parts[0])
    const amount_str = parts[parts.length - 1].trim()

    // Pula linhas inválidas
    if (!amount_str.match(/[\d,.-]/)) continue

    const { amount, wasNegative } = normalizeAmount(amount_str)
    if (amount === 0) continue

    // Descrição é tudo entre data e valor
    const description = parts.slice(1, parts.length - 1).join(' ').trim() || 'Transação'

    transactions.push({
      date,
      description,
      amount,
      raw_type: wasNegative ? 'negative' : 'positive'
    })
  }

  return transactions
}

/**
 * Parse CSV genérico
 */
function parseCSV(text: string): RawTransaction[] {
  // Tenta Nubank first
  if (text.includes('Nubank') || text.toLowerCase().includes('categoria')) {
    const nubankTx = parseNubankCSV(text)
    if (nubankTx.length > 0) return nubankTx
  }

  let result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    dynamicTyping: false
  })

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
  const normalized = headers.map(h => h.toLowerCase().trim())

  const dateIdx = normalized.findIndex(h => h.includes('data') || h.includes('date'))
  const descIdx = normalized.findIndex(h => h.includes('descri') || h.includes('historico') || h.includes('detalhe'))
  const amountIdx = normalized.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('transacao'))

  if (dateIdx === -1 || amountIdx === -1) {
    return []
  }

  return rows
    .filter(row => {
      const amountValue = row[headers[amountIdx]]
      if (!amountValue) return false
      const { amount } = normalizeAmount(amountValue)
      return amount > 0
    })
    .map(row => {
      const date = normalizeDate(row[headers[dateIdx]])
      let description = 'Transação'
      if (descIdx >= 0) {
        description = String(row[headers[descIdx]] || 'Transação').trim()
      }

      const { amount, wasNegative } = normalizeAmount(row[headers[amountIdx]])

      return {
        date,
        description,
        amount,
        raw_type: wasNegative ? 'negative' : 'positive'
      }
    })
}

/**
 * Parse OFX
 */
function parseOFX(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []

  // OFX usa tags XML-like
  const txPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  let match: RegExpExecArray | null

  while ((match = txPattern.exec(text)) !== null) {
    const txBlock = match[1]

    // Extrai campos
    const dateMatch = txBlock.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = txBlock.match(/<TRNAMT>([-\d.]+)/);
    const memoMatch = txBlock.match(/<MEMO>([^<]+)/);
    const nameMatch = txBlock.match(/<NAME>([^<]+)/);

    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1]
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      const date = `${year}-${month}-${day}`

      const amountValue = parseFloat(amountMatch[1])
      const amount = Math.abs(amountValue)
      const raw_type: 'positive' | 'negative' = amountValue >= 0 ? 'positive' : 'negative'

      const description = nameMatch ? nameMatch[1].trim() :
                         memoMatch ? memoMatch[1].trim() :
                         'Transação'

      transactions.push({
        date,
        description,
        amount,
        raw_type
      })
    }
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
    // OFX
    if (filename.endsWith('.ofx') || text.includes('<OFX>')) {
      transactions = parseOFX(text)
      if (transactions.length > 0) {
        format = 'ofx'
        return { transactions, format, errors }
      }
    }

    // CSV
    if (filename.endsWith('.csv') || text.includes(',')) {
      transactions = parseCSV(text)
      if (transactions.length > 0) {
        format = 'csv'
        return { transactions, format, errors }
      }
    }

    // PDF - tenta Nubank primeiro
    if (filename.endsWith('.pdf') || text.includes('Nubank') || text.includes('NU PAGAMENTOS')) {
      transactions = parseNubankPDF(text)
      if (transactions.length > 0) {
        format = 'pdf'
        return { transactions, format, errors }
      }

      // Tenta genérico
      transactions = parseGenericPDF(text)
      if (transactions.length > 0) {
        format = 'pdf'
        return { transactions, format, errors }
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
