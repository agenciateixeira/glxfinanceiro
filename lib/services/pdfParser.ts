/**
 * Parser de PDF para extratos bancários e faturas de cartão
 * Suporta múltiplos formatos de bancos brasileiros
 */

export interface ParsedTransaction {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  type: 'income' | 'expense'
  rawText?: string // Texto original para debug
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  bankName?: string
  errors: string[]
}

/**
 * Patterns regex para diferentes formatos de bancos brasileiros
 */
const BANK_PATTERNS = {
  // Nubank
  nubank: {
    name: 'Nubank',
    // Exemplo: 15 JAN Coffee Shop - R$ 25,50
    pattern: /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([^\n]+?)\s+R?\$?\s*([\d.]+,\d{2})/gi,
    dateFormat: 'DD MMM'
  },

  // Itaú
  itau: {
    name: 'Itaú',
    // Exemplo: 15/01/2024 COMPRA CARTAO *1234 R$ 125,00 D
    pattern: /(\d{2}\/\d{2}\/\d{4})\s+([^\n]+?)\s+R?\$?\s*([\d.]+,\d{2})\s*([DC])?/gi,
    dateFormat: 'DD/MM/YYYY'
  },

  // Bradesco
  bradesco: {
    name: 'Bradesco',
    // Exemplo: 15/01 COMPRA - LOJA XYZ 150,00-
    pattern: /(\d{2}\/\d{2})\s+([^\n]+?)\s+([\d.]+,\d{2})[-+]/gi,
    dateFormat: 'DD/MM'
  },

  // Banco do Brasil
  bb: {
    name: 'Banco do Brasil',
    // Exemplo: 15/01/2024 Compra com Cartão 1234 -125,00
    pattern: /(\d{2}\/\d{2}\/\d{4})\s+([^\n]+?)\s+([-+]?[\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM/YYYY'
  },

  // Santander (PJ e PF)
  santander: {
    name: 'Santander',
    // Exemplo: 23/02/2026 Tarifa Avulsa Envio Pix - R$ 7,80
    // Exemplo: 23/02/2026 Saldo do dia Cc + ContaMax principal R$ 827,93
    pattern: /(\d{2}\/\d{2}\/\d{4})\s+([^\n]+?)\s+(-\s*)?R?\$\s*([\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM/YYYY'
  },

  // Caixa
  caixa: {
    name: 'Caixa Econômica',
    // Exemplo: 15/01/2024 PAGAMENTO - LOJA 125,00
    pattern: /(\d{2}\/\d{2}\/\d{4})\s+([^\n]+?)\s+([\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM/YYYY'
  },

  // Inter
  inter: {
    name: 'Banco Inter',
    // Exemplo: 15/01 - Compra no débito - Loja XYZ - R$ 125,00
    pattern: /(\d{2}\/\d{2})\s*[-–]\s*([^\n]+?)\s*[-–]\s*R?\$?\s*([\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM'
  },

  // C6 Bank
  c6: {
    name: 'C6 Bank',
    // Exemplo: 15/01/2024 | COMPRA | Loja XYZ | R$ 125,00
    pattern: /(\d{2}\/\d{2}\/\d{4})\s*\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|\s*R?\$?\s*([\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM/YYYY'
  },

  // Genérico (formato comum)
  generic: {
    name: 'Genérico',
    // Exemplo: 15/01/2024 Descrição R$ 125,00
    pattern: /(\d{2}\/\d{2}(?:\/\d{4})?)\s+([^\n]+?)\s+R?\$?\s*([\d.]+,\d{2})/gi,
    dateFormat: 'DD/MM/YYYY'
  }
}

/**
 * Meses em português para conversão
 */
const MONTH_MAP: Record<string, string> = {
  'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
  'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
  'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
}

/**
 * Converte string de valor brasileiro para número
 * Exemplo: "1.234,56" -> 1234.56
 */
function parseBrazilianNumber(value: string): number {
  return parseFloat(
    value
      .replace(/\./g, '') // Remove separador de milhares
      .replace(',', '.') // Substitui vírgula por ponto
  )
}

/**
 * Normaliza data para formato ISO (YYYY-MM-DD)
 */
function normalizeDate(dateStr: string, format: string, currentYear?: number): string {
  const year = currentYear || new Date().getFullYear()

  // DD MMM (15 JAN)
  if (format === 'DD MMM') {
    const [day, monthAbbr] = dateStr.split(/\s+/)
    const month = MONTH_MAP[monthAbbr.toUpperCase()]
    if (!month) return ''
    return `${year}-${month}-${day.padStart(2, '0')}`
  }

  // DD/MM/YYYY (15/01/2024)
  if (format === 'DD/MM/YYYY') {
    const [day, month, yearPart] = dateStr.split('/')
    return `${yearPart}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // DD/MM (15/01)
  if (format === 'DD/MM') {
    const [day, month] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return dateStr
}

/**
 * Limpa descrição removendo informações desnecessárias
 */
function cleanDescription(description: string): string {
  return description
    // Remove códigos de autorização
    .replace(/AUT[:\s]*\d+/gi, '')
    // Remove números de cartão mascarados
    .replace(/\*+\d{4}/g, '')
    // Remove texto comum de transações
    .replace(/COMPRA\s+(?:CARTAO|DEBITO|CREDITO)/gi, '')
    .replace(/PAGAMENTO(?:\s+DE)?/gi, '')
    .replace(/TRANSFERENCIA(?:\s+ENVIADA|\s+RECEBIDA)?/gi, '')
    // Remove códigos e IDs
    .replace(/\b[A-Z0-9]{10,}\b/g, '')
    // Remove espaços múltiplos
    .replace(/\s+/g, ' ')
    // Remove caracteres especiais no início/fim
    .replace(/^[-–\s|]+|[-–\s|]+$/g, '')
    .trim()
}

/**
 * Detecta se é receita ou despesa baseado no valor e contexto
 */
function detectTransactionType(amount: string, description: string): 'income' | 'expense' {
  const desc = description.toLowerCase()

  // Palavras-chave que indicam receita
  const incomeKeywords = [
    'deposito', 'recebido', 'transferencia recebida', 'pix recebido',
    'credito', 'salario', 'pagamento recebido', 'rendimento',
    'resgate', 'dividendo', 'estorno'
  ]

  // Palavras-chave que indicam despesa
  const expenseKeywords = [
    'compra', 'debito', 'saque', 'pagamento', 'transferencia enviada',
    'pix enviado', 'fatura', 'boleto', 'tarifa', 'juros'
  ]

  // Verifica palavras-chave
  if (incomeKeywords.some(keyword => desc.includes(keyword))) {
    return 'income'
  }

  if (expenseKeywords.some(keyword => desc.includes(keyword))) {
    return 'expense'
  }

  // Se tem sinal negativo, é despesa
  if (amount.includes('-')) {
    return 'expense'
  }

  // Se tem sinal positivo, é receita
  if (amount.includes('+')) {
    return 'income'
  }

  // Por padrão, considera despesa (mais comum em extratos)
  return 'expense'
}

/**
 * Tenta detectar qual banco baseado no texto do PDF
 */
function detectBank(text: string): string | null {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('nubank') || lowerText.includes('nu pagamentos')) {
    return 'nubank'
  }
  if (lowerText.includes('itaú') || lowerText.includes('itau')) {
    return 'itau'
  }
  if (lowerText.includes('bradesco')) {
    return 'bradesco'
  }
  if (lowerText.includes('banco do brasil') || lowerText.includes('bb.com.br')) {
    return 'bb'
  }
  if (lowerText.includes('santander')) {
    return 'santander'
  }
  if (lowerText.includes('caixa econômica') || lowerText.includes('caixa economica')) {
    return 'caixa'
  }
  if (lowerText.includes('inter') || lowerText.includes('banco inter')) {
    return 'inter'
  }
  if (lowerText.includes('c6 bank') || lowerText.includes('c6bank')) {
    return 'c6'
  }

  return null
}

/**
 * Extrai ano do período do extrato
 * Exemplo: "Período: 01/01/2024 a 31/01/2024"
 */
function extractYear(text: string): number | undefined {
  const yearMatch = text.match(/20\d{2}/)
  return yearMatch ? parseInt(yearMatch[0]) : undefined
}

/**
 * Parse transações usando um padrão específico
 */
function parseWithPattern(
  text: string,
  patternName: string,
  currentYear?: number
): ParsedTransaction[] {
  const pattern = BANK_PATTERNS[patternName as keyof typeof BANK_PATTERNS]
  if (!pattern) return []

  const transactions: ParsedTransaction[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.pattern.exec(text)) !== null) {
    try {
      let date: string
      let description: string
      let amountStr: string
      let typeIndicator: string | undefined

      // Nubank format
      if (patternName === 'nubank') {
        date = normalizeDate(`${match[1]} ${match[2]}`, pattern.dateFormat, currentYear)
        description = cleanDescription(match[3])
        amountStr = match[4]
        // Nubank sempre mostra despesas
        typeIndicator = '-'
      }
      // Santander format
      else if (patternName === 'santander') {
        date = normalizeDate(match[1], pattern.dateFormat, currentYear)
        description = cleanDescription(match[2])
        typeIndicator = match[3] ? '-' : '+' // Se tem "- " antes do R$, é despesa
        amountStr = match[4]
      }
      // Itaú format
      else if (patternName === 'itau') {
        date = normalizeDate(match[1], pattern.dateFormat, currentYear)
        description = cleanDescription(match[2])
        amountStr = match[3]
        typeIndicator = match[4] // D ou C
      }
      // C6 format
      else if (patternName === 'c6') {
        date = normalizeDate(match[1], pattern.dateFormat, currentYear)
        description = cleanDescription(`${match[2]} ${match[3]}`)
        amountStr = match[4]
      }
      // Formato genérico
      else {
        date = normalizeDate(match[1], pattern.dateFormat, currentYear)
        description = cleanDescription(match[2])
        amountStr = match[3]
      }

      // Valida se a descrição não está vazia
      if (!description || description.length < 3) continue

      // Ignora linhas de saldo (não são transações)
      if (description.toLowerCase().includes('saldo do dia') ||
          description.toLowerCase().includes('saldo anterior') ||
          description.toLowerCase().includes('saldo atual')) {
        continue
      }

      const amount = parseBrazilianNumber(amountStr.replace(/[+-]/g, ''))

      // Ignora valores zerados
      if (amount === 0) continue

      // Detecta tipo (receita/despesa)
      let type: 'income' | 'expense' = 'expense'

      if (typeIndicator === 'C' || typeIndicator === '+') {
        type = 'income'
      } else if (typeIndicator === 'D' || typeIndicator === '-') {
        type = 'expense'
      } else {
        type = detectTransactionType(amountStr, description)
      }

      transactions.push({
        date,
        description,
        amount,
        type,
        rawText: match[0]
      })
    } catch (error) {
      console.error('Error parsing transaction:', error, match[0])
    }
  }

  return transactions
}

/**
 * Função principal que faz o parse do texto do PDF
 */
export function parsePDFText(text: string): ParseResult {
  const errors: string[] = []
  let transactions: ParsedTransaction[] = []

  try {
    // Detecta o banco
    const detectedBank = detectBank(text)
    const bankName = detectedBank ? BANK_PATTERNS[detectedBank as keyof typeof BANK_PATTERNS].name : undefined

    // Extrai ano do período
    const currentYear = extractYear(text)

    // Tenta parsear com o padrão do banco detectado
    if (detectedBank) {
      transactions = parseWithPattern(text, detectedBank, currentYear)
    }

    // Se não encontrou transações, tenta com todos os padrões
    if (transactions.length === 0) {
      for (const patternName of Object.keys(BANK_PATTERNS)) {
        const parsed = parseWithPattern(text, patternName, currentYear)
        if (parsed.length > 0) {
          transactions = parsed
          break
        }
      }
    }

    // Se ainda não encontrou, adiciona erro
    if (transactions.length === 0) {
      errors.push('Nenhuma transação foi encontrada no PDF. Verifique se o formato é suportado.')
    }

    // Remove duplicatas baseado em data + descrição + valor
    const uniqueTransactions = transactions.filter((transaction, index, self) =>
      index === self.findIndex(t =>
        t.date === transaction.date &&
        t.description === transaction.description &&
        t.amount === transaction.amount
      )
    )

    return {
      transactions: uniqueTransactions,
      bankName,
      errors
    }
  } catch (error) {
    errors.push(`Erro ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    return {
      transactions: [],
      errors
    }
  }
}

/**
 * Valida se o PDF contém informações de transações
 */
export function validatePDFContent(text: string): { isValid: boolean; error?: string } {
  // Verifica tamanho mínimo
  if (text.length < 100) {
    return { isValid: false, error: 'O PDF parece estar vazio ou corrompido' }
  }

  // Verifica se contém palavras-chave relacionadas a banco/finanças
  const financialKeywords = [
    'extrato', 'fatura', 'transação', 'transacao', 'saldo',
    'credito', 'debito', 'pagamento', 'compra', 'transferencia',
    'r$', 'real', 'reais'
  ]

  const hasFinancialContent = financialKeywords.some(keyword =>
    text.toLowerCase().includes(keyword)
  )

  if (!hasFinancialContent) {
    return {
      isValid: false,
      error: 'O PDF não parece ser um extrato bancário ou fatura de cartão'
    }
  }

  return { isValid: true }
}
