import { NextRequest, NextResponse } from 'next/server'
import { parsePDFText } from '@/lib/services/pdfParser'
import { parseUniversal } from '@/lib/services/universalParser'
import { createClient } from '@/lib/supabase/server'
import { suggestCategory } from '@/lib/services/categorization'
import { detectPeriod, checkDuplicatePeriod } from '@/lib/services/periodDetection'
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

    let parseResult: any
    let transactions: any[] = []

    // Parse baseado no tipo de arquivo
    if (filename.endsWith('.pdf')) {
      // PDF - usa parser específico
      const pdfData = await parsePDF(buffer)
      const pdfResult = parsePDFText(pdfData.text)

      transactions = pdfResult.transactions
      parseResult = {
        detectedFormat: 'pdf',
        detectedType: 'unknown',
        bankName: pdfResult.bankName
      }
    } else if (filename.endsWith('.csv') || filename.endsWith('.xml') || filename.endsWith('.ofx')) {
      // CSV, XML, OFX - usa parser universal
      const text = buffer.toString('utf-8')
      parseResult = parseUniversal(text, filename)
      transactions = parseResult.transactions
    } else {
      // Tenta detectar automaticamente
      const text = buffer.toString('utf-8')
      parseResult = parseUniversal(text, filename)
      transactions = parseResult.transactions
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação foi encontrada no arquivo' },
        { status: 400 }
      )
    }

    // Busca categorias existentes
    // RLS policies handle user filtering including shared spouse accounts
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name, type')

    const categoryMap = new Map(
      (existingCategories || []).map(c => [c.name.toLowerCase(), c])
    )

    // Cria categorias que não existem
    const newCategories: string[] = []
    const categoriesToCreate = new Set<string>()

    for (const transaction of transactions) {
      if (transaction.category && !categoryMap.has(transaction.category.toLowerCase())) {
        categoriesToCreate.add(transaction.category)
      }
    }

    // Cria novas categorias
    if (categoriesToCreate.size > 0) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

      const { data: created } = await supabase
        .from('categories')
        .insert(
          Array.from(categoriesToCreate).map((name, index) => ({
            user_id: user.id,
            name,
            color: colors[index % colors.length],
            icon: '📁',
            type: 'expense', // Default, será ajustado depois
            is_system: false
          }))
        )
        .select()

      if (created) {
        for (const cat of created) {
          categoryMap.set(cat.name.toLowerCase(), cat)
          newCategories.push(cat.name)
        }
      }
    }

    // Categoriza transações usando IA
    const categorizedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        let categoryId = null
        let confidence = 0

        // Se tem categoria do arquivo, usa ela
        if (transaction.category) {
          const cat = categoryMap.get(transaction.category.toLowerCase())
          if (cat) {
            categoryId = cat.id
            confidence = 1
          }
        }

        // Se não tem categoria, sugere uma
        if (!categoryId) {
          const suggestion = await suggestCategory(
            user.id,
            transaction.description,
            transaction.type
          )
          categoryId = suggestion.category_id
          confidence = suggestion.confidence
        }

        return {
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          suggested_category_id: categoryId,
          confidence,
          matched_keywords: [],
          payment_method: transaction.payment_method || 'other'
        }
      })
    )

    // Detecta período automaticamente
    const detectedPeriod = detectPeriod(transactions)

    // Verifica se já existe importação para este período
    const sourceType = filename.endsWith('.pdf') ? 'pdf' :
                      filename.endsWith('.csv') ? 'csv' :
                      filename.endsWith('.xml') ? 'xml' : 'ofx'

    const duplicateCheck = await checkDuplicatePeriod(
      user.id,
      detectedPeriod.startDate,
      detectedPeriod.endDate,
      sourceType
    )

    return NextResponse.json({
      success: true,
      transactions: categorizedTransactions,
      metadata: {
        format: parseResult.detectedFormat,
        type: parseResult.detectedType,
        bankName: parseResult.bankName,
        totalTransactions: transactions.length,
        totalIncome: parseResult.totalIncome,
        totalExpense: parseResult.totalExpense,
        newCategoriesCreated: newCategories
      },
      period: {
        ...detectedPeriod,
        isDuplicate: duplicateCheck.exists,
        fileName: file.name
      }
    })
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Erro ao processar arquivo: ${error.message}`
          : 'Erro desconhecido ao processar arquivo'
      },
      { status: 500 }
    )
  }
}
