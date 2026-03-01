import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { name, type } = await request.json()

    // Validação
    if (!name || !type) {
      return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 })
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json({ error: 'Tipo deve ser income ou expense' }, { status: 400 })
    }

    // Verifica se já existe categoria com esse nome
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .eq('type', type)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 409 })
    }

    // Cria a categoria
    const { data: category, error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        icon: type === 'income' ? 'TrendingUp' : 'TrendingDown',
        color: type === 'income' ? '#10b981' : '#ef4444'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao criar categoria:', insertError)
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Erro no POST /api/categories:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
