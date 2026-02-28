import { NextRequest, NextResponse } from 'next/server'
import { parsePDFText, validatePDFContent } from '@/lib/services/pdfParser'
import { createClient } from '@/lib/supabase/server'
import { suggestCategory } from '@/lib/services/categorization'

// Função para extrair texto do PDF usando pdfjs-dist/legacy
async function parsePDF(buffer: Buffer) {
  // Importa a versão legacy para Node.js
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const uint8Array = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    fullText += pageText + '\n'
  }

  return { text: fullText, numPages: pdf.numPages }
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

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Por favor, envie um arquivo PDF' },
        { status: 400 }
      )
    }

    // Converte para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extrai texto do PDF
    const pdfData = await parsePDF(buffer)
    const text = pdfData.text

    // Valida conteúdo
    const validation = validatePDFContent(text)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Arquivo PDF inválido' },
        { status: 400 }
      )
    }

    // Parse transações
    const parseResult = parsePDFText(text)

    if (parseResult.errors.length > 0 && parseResult.transactions.length === 0) {
      return NextResponse.json(
        { error: parseResult.errors[0] },
        { status: 400 }
      )
    }

    // Categoriza transações
    const categorizedTransactions = await Promise.all(
      parseResult.transactions.map(async (transaction) => {
        const suggestion = await suggestCategory(
          user.id,
          transaction.description,
          transaction.type
        )

        return {
          ...transaction,
          suggested_category_id: suggestion.category_id,
          confidence: suggestion.confidence,
          matched_keywords: suggestion.matched_keywords
        }
      })
    )

    return NextResponse.json({
      success: true,
      transactions: categorizedTransactions,
      bankName: parseResult.bankName,
      errors: parseResult.errors
    })
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Erro ao processar PDF: ${error.message}`
          : 'Erro desconhecido ao processar PDF'
      },
      { status: 500 }
    )
  }
}
