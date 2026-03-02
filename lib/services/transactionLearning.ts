/**
 * Serviço de Aprendizado de Transações
 * Busca padrões similares e sugere classificações
 */

import { createClient } from '@/lib/supabase/server'

export interface TransactionSuggestion {
  type?: 'income' | 'expense'
  category_id?: string
  confidence: number // 0-100
  source: 'pattern' | 'none'
}

/**
 * Normaliza descrição para matching
 * Remove números, converte para lowercase, remove espaços extras
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[0-9]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca sugestão de classificação baseada em padrões aprendidos
 */
export async function getSuggestion(
  userId: string,
  description: string
): Promise<TransactionSuggestion> {
  const supabase = await createClient()

  try {
    // Busca padrão similar usando a função do Postgres
    const { data, error } = await supabase
      .rpc('find_similar_pattern', {
        p_user_id: userId,
        p_description: description
      })

    if (error) {
      console.error('[Learning] Error finding pattern:', error)
      return { confidence: 0, source: 'none' }
    }

    if (!data || data.length === 0) {
      return { confidence: 0, source: 'none' }
    }

    const pattern = data[0]

    // Calcula confiança baseado em similaridade e score
    // similarity: 0.5 - 1.0 (do pg_trgm)
    // confidence_score: quantas vezes foi usado
    const similarityScore = pattern.similarity * 100 // 50-100
    const usageBonus = Math.min(pattern.confidence_score * 5, 30) // max +30
    const confidence = Math.min(similarityScore + usageBonus, 100)

    return {
      type: pattern.transaction_type,
      category_id: pattern.category_id,
      confidence: Math.round(confidence),
      source: 'pattern'
    }
  } catch (error) {
    console.error('[Learning] Unexpected error:', error)
    return { confidence: 0, source: 'none' }
  }
}

/**
 * Salva ou atualiza padrão de transação
 */
export async function savePattern(
  userId: string,
  description: string,
  type: 'income' | 'expense',
  categoryId: string | null
): Promise<void> {
  const supabase = await createClient()

  const normalized = normalizeDescription(description)

  try {
    // Verifica se já existe padrão similar
    const { data: existing } = await supabase
      .from('transaction_patterns')
      .select('id, confidence_score')
      .eq('user_id', userId)
      .eq('normalized_pattern', normalized)
      .eq('transaction_type', type)
      .maybeSingle()

    if (existing) {
      // Atualiza padrão existente (incrementa confidence)
      await supabase
        .from('transaction_patterns')
        .update({
          confidence_score: existing.confidence_score + 1,
          category_id: categoryId,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      console.log(`[Learning] Updated pattern (confidence: ${existing.confidence_score + 1})`)
    } else {
      // Cria novo padrão
      await supabase
        .from('transaction_patterns')
        .insert({
          user_id: userId,
          description_pattern: description,
          normalized_pattern: normalized,
          transaction_type: type,
          category_id: categoryId,
          confidence_score: 1
        })

      console.log('[Learning] Created new pattern')
    }
  } catch (error) {
    console.error('[Learning] Error saving pattern:', error)
    // Não falha - é apenas aprendizado
  }
}

/**
 * Busca sugestões em lote para múltiplas transações
 */
export async function getSuggestionsBatch(
  userId: string,
  descriptions: string[]
): Promise<Map<string, TransactionSuggestion>> {
  const suggestions = new Map<string, TransactionSuggestion>()

  // Busca sugestões em paralelo
  await Promise.all(
    descriptions.map(async (desc) => {
      const suggestion = await getSuggestion(userId, desc)
      suggestions.set(desc, suggestion)
    })
  )

  return suggestions
}

/**
 * Remove padrão específico
 */
export async function deletePattern(userId: string, patternId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('transaction_patterns')
    .delete()
    .eq('id', patternId)
    .eq('user_id', userId)
}

/**
 * Lista todos os padrões do usuário
 */
export async function getUserPatterns(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_patterns')
    .select(`
      id,
      description_pattern,
      transaction_type,
      category_id,
      confidence_score,
      last_used_at,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .order('last_used_at', { ascending: false })

  if (error) {
    console.error('[Learning] Error fetching patterns:', error)
    return []
  }

  return data || []
}
