import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
}

interface CategoryMapping {
  keyword: string
  category_id: string
  confidence_score: number
}

interface SuggestionResult {
  category_id: string | null
  confidence: number
  matched_keywords: string[]
}

// Palavras-chave padrão do sistema para categorização inicial
const DEFAULT_KEYWORDS: Record<string, { keywords: string[]; type: 'income' | 'expense' }> = {
  // Alimentação
  'alimentacao': {
    keywords: [
      'restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado',
      'ifood', 'uber eats', 'rappi', 'delivery', 'coffee', 'cafe',
      'pizzaria', 'hamburgueria', 'açougue', 'hortifruti', 'feira',
      'bar', 'pub', 'choperia', 'bakery', 'grocery'
    ],
    type: 'expense'
  },

  // Transporte
  'transporte': {
    keywords: [
      'uber', 'taxi', '99', 'posto', 'gasolina', 'combustivel',
      'estacionamento', 'parking', 'pedagio', 'onibus', 'metro',
      'trem', 'mecanica', 'oficina', 'ipva', 'seguro auto',
      'vistoria', 'lavagem', 'lava rapido'
    ],
    type: 'expense'
  },

  // Saúde
  'saude': {
    keywords: [
      'farmacia', 'drogaria', 'droga', 'hospital', 'clinica',
      'medico', 'dentista', 'odonto', 'laboratorio', 'exame',
      'consulta', 'terapia', 'fisioterapeuta', 'plano de saude',
      'unimed', 'amil', 'sulamerica'
    ],
    type: 'expense'
  },

  // Educação
  'educacao': {
    keywords: [
      'escola', 'faculdade', 'universidade', 'curso', 'livro',
      'livraria', 'material escolar', 'papelaria', 'mensalidade',
      'matricula', 'udemy', 'coursera', 'hotmart', 'eduzz'
    ],
    type: 'expense'
  },

  // Lazer
  'lazer': {
    keywords: [
      'cinema', 'teatro', 'show', 'ingresso', 'streaming',
      'netflix', 'spotify', 'amazon prime', 'disney', 'hbo',
      'youtube', 'games', 'steam', 'playstation', 'xbox',
      'viagem', 'hotel', 'airbnb', 'booking', 'passagem'
    ],
    type: 'expense'
  },

  // Compras
  'compras': {
    keywords: [
      'amazon', 'mercado livre', 'shopee', 'shein', 'aliexpress',
      'magazine luiza', 'casas bahia', 'americanas', 'lojas',
      'shopping', 'zara', 'renner', 'c&a', 'riachuelo'
    ],
    type: 'expense'
  },

  // Moradia
  'moradia': {
    keywords: [
      'aluguel', 'condominio', 'agua', 'luz', 'energia',
      'internet', 'gas', 'iptu', 'telefone', 'celular',
      'vivo', 'claro', 'tim', 'oi', 'net', 'sky'
    ],
    type: 'expense'
  },

  // Salário/Receitas
  'salario': {
    keywords: [
      'salario', 'pagamento', 'pix recebido', 'transferencia recebida',
      'deposito', 'rendimento', 'freelance', 'consultoria',
      'honorarios', 'comissao', 'bonus', 'reembolso'
    ],
    type: 'income'
  },

  // Investimentos (receita)
  'investimentos': {
    keywords: [
      'dividendo', 'resgate', 'rendimento cdb', 'rendimento lci',
      'rendimento lca', 'juros', 'aplicacao'
    ],
    type: 'income'
  }
}

/**
 * Normaliza texto removendo acentos, convertendo para minúsculas e removendo caracteres especiais
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .trim()
}

/**
 * Extrai palavras-chave relevantes de uma descrição
 */
function extractKeywords(description: string): string[] {
  const normalized = normalizeText(description)
  const words = normalized.split(' ').filter(w => w.length > 2)

  // Remove stopwords comuns em português
  const stopwords = ['para', 'com', 'por', 'em', 'de', 'da', 'do', 'dos', 'das', 'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as']
  return words.filter(w => !stopwords.includes(w))
}

/**
 * Calcula score de similaridade entre duas strings usando palavras em comum
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractKeywords(text1))
  const words2 = new Set(extractKeywords(text2))

  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Busca categorias aprendidas do usuário
 */
async function getUserMappings(userId: string): Promise<CategoryMapping[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('category_mappings')
    .select('keyword, category_id, confidence_score')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })

  if (error) {
    console.error('Error fetching user mappings:', error)
    return []
  }

  return data || []
}

/**
 * Busca transações históricas do usuário para aprender padrões
 */
async function getHistoricalTransactions(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      description,
      category_id,
      categories (
        id,
        name,
        type
      )
    `)
    .eq('user_id', userId)
    .not('category_id', 'is', null)
    .limit(500)

  if (error) {
    console.error('Error fetching historical transactions:', error)
    return []
  }

  return data || []
}

/**
 * Sugere categoria baseada em palavras-chave padrão
 */
function suggestFromDefaultKeywords(
  description: string,
  type: 'income' | 'expense',
  categories: Category[]
): SuggestionResult {
  const normalizedDesc = normalizeText(description)
  let bestMatch: SuggestionResult = {
    category_id: null,
    confidence: 0,
    matched_keywords: []
  }

  for (const [categoryName, { keywords, type: keywordType }] of Object.entries(DEFAULT_KEYWORDS)) {
    // Só considera categorias do mesmo tipo (receita/despesa)
    if (keywordType !== type) continue

    const matchedKeywords: string[] = []
    let matchScore = 0

    for (const keyword of keywords) {
      if (normalizedDesc.includes(normalizeText(keyword))) {
        matchedKeywords.push(keyword)
        matchScore += 1
      }
    }

    if (matchScore > 0) {
      // Calcula confidence baseado na quantidade de matches
      const confidence = Math.min(matchScore / keywords.length, 1)

      if (confidence > bestMatch.confidence) {
        // Encontra a categoria correspondente
        const category = categories.find(c =>
          normalizeText(c.name).includes(categoryName) && c.type === type
        )

        if (category) {
          bestMatch = {
            category_id: category.id,
            confidence,
            matched_keywords: matchedKeywords
          }
        }
      }
    }
  }

  return bestMatch
}

/**
 * Sugere categoria baseada em mapeamentos aprendidos do usuário
 */
function suggestFromUserMappings(
  description: string,
  mappings: CategoryMapping[]
): SuggestionResult {
  const normalizedDesc = normalizeText(description)
  let bestMatch: SuggestionResult = {
    category_id: null,
    confidence: 0,
    matched_keywords: []
  }

  for (const mapping of mappings) {
    const normalizedKeyword = normalizeText(mapping.keyword)

    if (normalizedDesc.includes(normalizedKeyword)) {
      const confidence = Math.min(mapping.confidence_score / 10, 1) // Normaliza para 0-1

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          category_id: mapping.category_id,
          confidence,
          matched_keywords: [mapping.keyword]
        }
      }
    }
  }

  return bestMatch
}

/**
 * Sugere categoria baseada em transações históricas similares
 */
function suggestFromHistory(
  description: string,
  historical: any[]
): SuggestionResult {
  let bestMatch: SuggestionResult = {
    category_id: null,
    confidence: 0,
    matched_keywords: []
  }

  for (const transaction of historical) {
    const similarity = calculateSimilarity(description, transaction.description)

    if (similarity > bestMatch.confidence && similarity > 0.3) { // Threshold mínimo de 30%
      bestMatch = {
        category_id: transaction.category_id,
        confidence: similarity,
        matched_keywords: extractKeywords(transaction.description)
      }
    }
  }

  return bestMatch
}

/**
 * Função principal que sugere categoria para uma transação
 * Combina múltiplas estratégias e retorna a melhor sugestão
 */
export async function suggestCategory(
  userId: string,
  description: string,
  type: 'income' | 'expense'
): Promise<SuggestionResult> {
  const supabase = createClient()

  // Busca todas as categorias disponíveis
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .eq('type', type)

  if (!categories || categories.length === 0) {
    return { category_id: null, confidence: 0, matched_keywords: [] }
  }

  // Busca mapeamentos aprendidos do usuário
  const userMappings = await getUserMappings(userId)

  // Busca histórico de transações
  const historical = await getHistoricalTransactions(userId)

  // Tenta todas as estratégias
  const suggestions = [
    suggestFromUserMappings(description, userMappings),
    suggestFromHistory(description, historical),
    suggestFromDefaultKeywords(description, type, categories)
  ]

  // Retorna a sugestão com maior confidence
  return suggestions.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  )
}

/**
 * Salva ou atualiza um mapeamento de categorização
 * Incrementa o confidence_score se já existir
 */
export async function saveCategoryMapping(
  userId: string,
  description: string,
  categoryId: string
): Promise<void> {
  const supabase = createClient()
  const keywords = extractKeywords(description)

  // Salva os principais keywords (máximo 3)
  for (const keyword of keywords.slice(0, 3)) {
    const { data: existing } = await supabase
      .from('category_mappings')
      .select('id, confidence_score')
      .eq('user_id', userId)
      .eq('keyword', keyword)
      .eq('category_id', categoryId)
      .single()

    if (existing) {
      // Incrementa o score se já existe
      await supabase
        .from('category_mappings')
        .update({
          confidence_score: existing.confidence_score + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Cria novo mapeamento
      await supabase
        .from('category_mappings')
        .insert({
          user_id: userId,
          keyword,
          category_id: categoryId,
          confidence_score: 1
        })
    }
  }
}

/**
 * Processa múltiplas transações em lote e retorna sugestões
 */
export async function batchSuggestCategories(
  userId: string,
  transactions: { description: string; type: 'income' | 'expense' }[]
): Promise<SuggestionResult[]> {
  const suggestions: SuggestionResult[] = []

  for (const transaction of transactions) {
    const suggestion = await suggestCategory(
      userId,
      transaction.description,
      transaction.type
    )
    suggestions.push(suggestion)
  }

  return suggestions
}
