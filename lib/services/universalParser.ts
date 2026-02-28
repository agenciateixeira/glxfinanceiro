/**
 * Parser Universal Inteligente
 * Suporta: PDF, CSV, XML, OFX
 * Detecta automaticamente colunas e tipo de arquivo
 * Cria categorias automaticamente se não existirem
 */

import Papa from 'papaparse'
import { XMLParser } from 'fast-xml-parser'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category?: string
  payment_method?: string
  balance?: number
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  detectedFormat: 'pdf' | 'csv' | 'xml' | 'ofx' | 'unknown'
  detectedType: 'bank_statement' | 'credit_card' | 'unknown'
  totalIncome: number
  totalExpense: number
  suggestedCategories: string[]
}

/**
 * Normaliza valores monetários de diversos formatos
 */
function normalizeAmount(value: any): number {
  if (typeof value === 'number') return Math.abs(value)

  const str = String(value)
    .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e sinal
    .replace(/\./g, '') // Remove pontos (separador de milhares)
    .replace(',', '.') // Substitui vírgula por ponto

  return Math.abs(parseFloat(str) || 0)
}

/**
 * Normaliza data de diversos formatos para YYYY-MM-DD
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
 * Detecta se é receita ou despesa baseado em indicadores
 */
function detectType(row: any): 'income' | 'expense' {
  const rowStr = JSON.stringify(row).toLowerCase()

  // Indicadores de receita
  if (
    rowStr.includes('credito') ||
    rowStr.includes('deposito') ||
    rowStr.includes('recebido') ||
    rowStr.includes('entrada') ||
    rowStr.includes('salario') ||
    rowStr.includes('receita')
  ) {
    return 'income'
  }

  // Indicadores de despesa
  if (
    rowStr.includes('debito') ||
    rowStr.includes('saque') ||
    rowStr.includes('pagamento') ||
    rowStr.includes('compra') ||
    rowStr.includes('saida') ||
    rowStr.includes('despesa')
  ) {
    return 'expense'
  }

  // Verifica sinal negativo em valores
  const amountStr = String(row.valor || row.amount || row.valor_transacao || '')
  if (amountStr.includes('-')) {
    return 'expense'
  }

  // Default: despesa (mais comum em extratos)
  return 'expense'
}

/**
 * Detecta colunas automaticamente baseado em nomes comuns
 */
function detectColumns(headers: string[]) {
  const normalized = headers.map(h => h.toLowerCase().trim())

  return {
    date: normalized.findIndex(h =>
      h.includes('data') || h.includes('date') || h === 'dia'
    ),
    description: normalized.findIndex(h =>
      h.includes('descri') || h.includes('historico') ||
      h.includes('detalhe') || h.includes('description') ||
      h.includes('estabelecimento') || h.includes('comercio')
    ),
    amount: normalized.findIndex(h =>
      h.includes('valor') || h.includes('amount') ||
      h.includes('total') || h.includes('transacao')
    ),
    category: normalized.findIndex(h =>
      h.includes('categoria') || h.includes('category') ||
      h.includes('tipo')
    ),
    balance: normalized.findIndex(h =>
      h.includes('saldo') || h.includes('balance')
    )
  }
}

/**
 * Extrai categoria da descrição usando IA simples
 */
function extractCategory(description: string): string | undefined {
  const desc = description.toLowerCase()

  // Mapeamento de palavras-chave para categorias
  const categoryMap: Record<string, string[]> = {
    'Alimentação': ['restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'ifood', 'delivery'],
    'Transporte': ['uber', 'taxi', '99', 'posto', 'gasolina', 'combustivel', 'estacionamento'],
    'Saúde': ['farmacia', 'drogaria', 'hospital', 'clinica', 'medico', 'dentista'],
    'Moradia': ['aluguel', 'condominio', 'agua', 'luz', 'energia', 'internet', 'gas'],
    'Compras': ['amazon', 'mercado livre', 'shopee', 'shein', 'magazine', 'lojas'],
    'Lazer': ['cinema', 'teatro', 'show', 'netflix', 'spotify', 'streaming'],
    'Educação': ['escola', 'curso', 'livro', 'faculdade'],
    'Salário': ['salario', 'pagamento', 'deposito'],
  }

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category
    }
  }

  return undefined
}

/**
 * Parse CSV
 */
export function parseCSV(text: string): ParsedTransaction[] {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    dynamicTyping: false
  })

  if (!result.data || result.data.length === 0) {
    // Tenta com ponto e vírgula
    const result2 = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      dynamicTyping: false
    })

    if (!result2.data || result2.data.length === 0) {
      return []
    }

    return parseCSVRows(result2.data as any[])
  }

  return parseCSVRows(result.data as any[])
}

function parseCSVRows(rows: any[]): ParsedTransaction[] {
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])
  const columns = detectColumns(headers)

  return rows
    .filter(row => {
      // Filtra linhas vazias ou sem valor
      const amount = row[headers[columns.amount]]
      return amount && normalizeAmount(amount) > 0
    })
    .map(row => {
      const date = normalizeDate(row[headers[columns.date]] || new Date())
      const description = String(row[headers[columns.description]] || 'Transação')
      const amount = normalizeAmount(row[headers[columns.amount]] || 0)
      const type = detectType(row)
      const category = columns.category >= 0
        ? row[headers[columns.category]]
        : extractCategory(description)

      return {
        date,
        description: description.trim(),
        amount,
        type,
        category,
        balance: columns.balance >= 0 ? normalizeAmount(row[headers[columns.balance]]) : undefined
      }
    })
}

/**
 * Parse XML/OFX
 */
export function parseXML(text: string): ParsedTransaction[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  })

  try {
    const data = parser.parse(text)

    // OFX Format
    if (data.OFX || data.ofx) {
      return parseOFX(data)
    }

    // Generic XML - tenta encontrar transações
    return parseGenericXML(data)
  } catch (error) {
    console.error('Error parsing XML:', error)
    return []
  }
}

function parseOFX(data: any): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Navega pela estrutura OFX
  const ofx = data.OFX || data.ofx
  const bankmsgs = ofx.BANKMSGSRSV1 || ofx.bankmsgsrsv1
  const stmtrs = bankmsgs?.STMTTRNRS?.STMTRS || bankmsgs?.stmttrnrs?.stmtrs
  const tranlist = stmtrs?.BANKTRANLIST || stmtrs?.banktranlist

  let stmttrns = tranlist?.STMTTRN || tranlist?.stmttrn || []

  if (!Array.isArray(stmttrns)) {
    stmttrns = [stmttrns]
  }

  for (const trn of stmttrns) {
    if (!trn) continue

    const amount = normalizeAmount(trn.TRNAMT || trn.trnamt || 0)
    if (amount === 0) continue

    const dateStr = String(trn.DTPOSTED || trn.dtposted || '')
    const date = dateStr.length >= 8
      ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      : normalizeDate(new Date())

    const description = String(trn.MEMO || trn.memo || trn.NAME || trn.name || 'Transação')
    const type = (trn.TRNTYPE || trn.trntype) === 'CREDIT' || amount > 0 ? 'income' : 'expense'

    transactions.push({
      date,
      description: description.trim(),
      amount: Math.abs(amount),
      type,
      category: extractCategory(description)
    })
  }

  return transactions
}

function parseGenericXML(data: any): ParsedTransaction[] {
  // Implementação básica - pode ser expandida conforme necessário
  const transactions: ParsedTransaction[] = []

  // Tenta encontrar arrays que possam ser transações
  function findTransactions(obj: any): void {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          // Verifica se parece uma transação
          const keys = Object.keys(item).map(k => k.toLowerCase())
          if (keys.some(k => k.includes('valor') || k.includes('amount'))) {
            // Tenta extrair transação
            const transaction = extractTransactionFromObject(item)
            if (transaction) transactions.push(transaction)
          }

          findTransactions(item)
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        findTransactions(value)
      }
    }
  }

  findTransactions(data)
  return transactions
}

function extractTransactionFromObject(obj: any): ParsedTransaction | null {
  const keys = Object.keys(obj)
  const lowerKeys = keys.map(k => k.toLowerCase())

  // Encontra campos
  const dateKey = keys[lowerKeys.findIndex(k => k.includes('data') || k.includes('date'))]
  const descKey = keys[lowerKeys.findIndex(k => k.includes('descri') || k.includes('historico'))]
  const amountKey = keys[lowerKeys.findIndex(k => k.includes('valor') || k.includes('amount'))]

  if (!amountKey) return null

  const amount = normalizeAmount(obj[amountKey])
  if (amount === 0) return null

  return {
    date: dateKey ? normalizeDate(obj[dateKey]) : normalizeDate(new Date()),
    description: descKey ? String(obj[descKey]).trim() : 'Transação',
    amount,
    type: detectType(obj),
    category: descKey ? extractCategory(String(obj[descKey])) : undefined
  }
}

/**
 * Parser Universal - detecta formato automaticamente
 */
export function parseUniversal(content: string | Buffer, filename: string): ParseResult {
  const text = content instanceof Buffer ? content.toString('utf-8') : content

  let transactions: ParsedTransaction[] = []
  let detectedFormat: ParseResult['detectedFormat'] = 'unknown'

  // Detecta CSV
  if (filename.endsWith('.csv') || text.includes(',') || text.includes(';')) {
    transactions = parseCSV(text)
    if (transactions.length > 0) detectedFormat = 'csv'
  }

  // Detecta XML/OFX
  if (!transactions.length && (filename.endsWith('.xml') || filename.endsWith('.ofx') || text.trim().startsWith('<'))) {
    transactions = parseXML(text)
    if (transactions.length > 0) {
      detectedFormat = text.includes('OFX') || text.includes('ofx') ? 'ofx' : 'xml'
    }
  }

  // Calcula totais
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  // Coleta categorias sugeridas únicas
  const suggestedCategories = [...new Set(
    transactions
      .map(t => t.category)
      .filter(Boolean) as string[]
  )]

  // Detecta tipo (extrato bancário vs cartão de crédito)
  const detectedType = detectStatementType(transactions, text)

  return {
    transactions,
    detectedFormat,
    detectedType,
    totalIncome,
    totalExpense,
    suggestedCategories
  }
}

function detectStatementType(transactions: ParsedTransaction[], text: string): ParseResult['detectedType'] {
  const lowerText = text.toLowerCase()

  if (
    lowerText.includes('cartao') ||
    lowerText.includes('fatura') ||
    lowerText.includes('credit card')
  ) {
    return 'credit_card'
  }

  if (
    lowerText.includes('extrato') ||
    lowerText.includes('banco') ||
    lowerText.includes('bank statement') ||
    lowerText.includes('saldo')
  ) {
    return 'bank_statement'
  }

  // Se tem mais despesas que receitas, provavelmente é cartão
  const expenseCount = transactions.filter(t => t.type === 'expense').length
  const incomeCount = transactions.filter(t => t.type === 'income').length

  if (expenseCount > incomeCount * 3) {
    return 'credit_card'
  }

  return 'unknown'
}
