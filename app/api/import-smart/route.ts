import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseSimple } from '@/lib/services/simpleParser'
import { getSuggestionsBatch } from '@/lib/services/transactionLearning'
import pdfParse from 'pdf-parse-fork'

// Função para extrair texto do PDF
async function parsePDF(buffer: Buffer) {
  const data = await pdfParse(buffer)
  return { text: data.text, numPages: data.numpages }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Lê o arquivo
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    const filename = file.name.toLowerCase()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extrai texto do PDF se necessário
    let content: string | Buffer = buffer
    if (filename.endsWith('.pdf')) {
      const pdfData = await parsePDF(buffer)
      content = pdfData.text
    }

    // Parse SIMPLES - apenas extrai dados brutos
    const parseResult = parseSimple(content, filename)

    if (parseResult.errors.length > 0) {
      console.error('[Import Smart] Parse errors:', parseResult.errors)
    }

    if (parseResult.transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação foi encontrada no arquivo' },
        { status: 400 }
      )
    }

    console.log(`[Import Smart] Found ${parseResult.transactions.length} transactions`)

    // Busca sugestões inteligentes para todas as transações
    const descriptions = parseResult.transactions.map(t => t.description)
    const suggestions = await getSuggestionsBatch(user.id, descriptions)

    // Monta resposta com transações + sugestões
    const transactionsWithSuggestions = parseResult.transactions.map((transaction) => {
      const suggestion = suggestions.get(transaction.description)

      return {
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        raw_type: transaction.raw_type,

        // Sugestões do sistema de aprendizado
        suggested_type: suggestion?.type,
        suggested_category_id: suggestion?.category_id,
        suggestion_confidence: suggestion?.confidence || 0,
        suggestion_source: suggestion?.source || 'none'
      }
    })

    // Calcula totais
    const totalAmount = parseResult.transactions.reduce((sum, t) => sum + t.amount, 0)

    // Detecta período inteligente
    const dates = parseResult.transactions.map(t => t.date).sort()
    const startDate = new Date(dates[0])
    const endDate = new Date(dates[dates.length - 1])

    // Calcula diferença em dias
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Detecta tipo de período
    let periodType: 'monthly' | 'weekly' | 'custom' = 'custom'
    let periodLabel = ''

    if (daysDiff >= 28 && daysDiff <= 31) {
      // Período mensal
      periodType = 'monthly'
      const month = startDate.toLocaleString('pt-BR', { month: 'long' })
      const year = startDate.getFullYear()
      periodLabel = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
    } else if (daysDiff >= 6 && daysDiff <= 8) {
      // Período semanal
      periodType = 'weekly'
      const weekStart = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      const weekEnd = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      periodLabel = `${weekStart} a ${weekEnd}`
    } else {
      // Período customizado
      periodLabel = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`
    }

    // Verifica se já existe período importado
    const { data: existingPeriod } = await supabase
      .from('import_periods')
      .select('id, start_date, end_date, type')
      .eq('user_id', user.id)
      .eq('start_date', dates[0])
      .eq('end_date', dates[dates.length - 1])
      .maybeSingle()

    const isDuplicate = !!existingPeriod

    return NextResponse.json({
      success: true,
      transactions: transactionsWithSuggestions,
      metadata: {
        total_transactions: parseResult.transactions.length,
        total_amount: totalAmount,
        format: parseResult.format,
        period: {
          start: dates[0],
          end: dates[dates.length - 1],
          type: periodType,
          label: periodLabel,
          days: daysDiff,
          is_duplicate: isDuplicate
        },
        has_suggestions: Array.from(suggestions.values()).some(s => s.confidence > 0)
      },
      warning: isDuplicate ? `Você já importou transações do período ${periodLabel}` : null
    })
  } catch (error) {
    console.error('[Import Smart] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro ao processar arquivo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
