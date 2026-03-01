import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { savePattern } from '@/lib/services/transactionLearning'

interface ClassifiedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense' // Escolhido pelo usuário
  category_id: string | null // Escolhido pelo usuário
  category_name?: string // Se criar nova categoria
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

    // Lê as transações classificadas
    const body = await request.json()
    const { transactions } = body as { transactions: ClassifiedTransaction[] }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação para importar' },
        { status: 400 }
      )
    }

    console.log(`[Confirm Import Smart] Processing ${transactions.length} transactions`)

    // Processa cada transação
    const results = []
    const newCategories = new Map<string, string>() // name -> id

    for (const transaction of transactions) {
      let categoryId = transaction.category_id

      // Se precisa criar nova categoria
      if (transaction.category_name && !transaction.category_id) {
        // Verifica se já criou neste lote
        if (newCategories.has(transaction.category_name)) {
          categoryId = newCategories.get(transaction.category_name)!
        } else {
          // Cria nova categoria
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: transaction.category_name,
              type: transaction.type,
              icon: transaction.type === 'income' ? 'TrendingUp' : 'TrendingDown',
              color: transaction.type === 'income' ? '#10b981' : '#ef4444',
              is_system: false
            })
            .select()
            .single()

          if (categoryError) {
            console.error('[Confirm Import Smart] Error creating category:', categoryError)
            continue
          }

          categoryId = newCategory.id
          newCategories.set(transaction.category_name, newCategory.id)
          console.log(`[Confirm Import Smart] Created category: ${transaction.category_name}`)
        }
      }

      // Salva transação
      const { data: savedTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: categoryId,
          payment_method: 'debit' // Default
        })
        .select()
        .single()

      if (transactionError) {
        console.error('[Confirm Import Smart] Error saving transaction:', transactionError)
        results.push({
          description: transaction.description,
          success: false,
          error: transactionError.message
        })
        continue
      }

      // APRENDE o padrão
      await savePattern(
        user.id,
        transaction.description,
        transaction.type,
        categoryId
      )

      results.push({
        description: transaction.description,
        success: true,
        transaction_id: savedTransaction.id
      })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`[Confirm Import Smart] Success: ${successCount}, Failed: ${failCount}`)

    return NextResponse.json({
      success: true,
      imported: successCount,
      failed: failCount,
      new_categories: Array.from(newCategories.keys()),
      results
    })
  } catch (error) {
    console.error('[Confirm Import Smart] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro ao importar transações',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
