import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerImportPeriod } from '@/lib/services/periodDetection'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { transactions, period, metadata } = body

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transações inválidas' },
        { status: 400 }
      )
    }

    // Registra o período de importação
    const periodId = await registerImportPeriod(user.id, period, {
      sourceType: metadata.sourceType || 'pdf',
      bankName: metadata.bankName,
      fileName: period.fileName,
      totalTransactions: transactions.length,
      totalIncome: metadata.totalIncome || 0,
      totalExpense: metadata.totalExpense || 0
    })

    // Insere as transações no banco
    const transactionsToInsert = transactions.map((t: any) => ({
      user_id: user.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category_id: t.suggested_category_id,
      payment_method: t.payment_method || 'other',
      notes: `Importado de: ${period.fileName}`,
      import_period_id: periodId
    }))

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select()

    if (error) {
      console.error('Error inserting transactions:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar transações' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      periodId,
      transactionsCreated: data.length
    })
  } catch (error) {
    console.error('Error confirming import:', error)
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Erro ao confirmar importação'
      },
      { status: 500 }
    )
  }
}
