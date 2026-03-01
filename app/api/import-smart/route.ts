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

    // Detecta período
    const dates = parseResult.transactions.map(t => t.date).sort()
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    return NextResponse.json({
      success: true,
      transactions: transactionsWithSuggestions,
      metadata: {
        total_transactions: parseResult.transactions.length,
        total_amount: totalAmount,
        format: parseResult.format,
        period: {
          start: startDate,
          end: endDate
        },
        has_suggestions: Array.from(suggestions.values()).some(s => s.confidence > 0)
      }
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
