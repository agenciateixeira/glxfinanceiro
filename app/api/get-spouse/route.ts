import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { spouseId } = await request.json()

    if (!spouseId) {
      return NextResponse.json(
        { error: 'ID do cônjuge é obrigatório' },
        { status: 400 }
      )
    }

    // Verifica se há vínculo entre os usuários
    const { data: link } = await supabase
      .from('shared_accounts')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .or(`user1_id.eq.${spouseId},user2_id.eq.${spouseId}`)
      .single()

    if (!link) {
      return NextResponse.json(
        { error: 'Nenhum vínculo encontrado com este usuário' },
        { status: 403 }
      )
    }

    // Busca nome na tabela users
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', spouseId)
      .maybeSingle()

    // Busca email do auth.users usando Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const getUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${spouseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })

    const authData = await getUserResponse.json()

    if (!getUserResponse.ok) {
      console.error('Erro ao buscar usuário do auth:', authData)
      return NextResponse.json(
        { error: 'Erro ao buscar dados do cônjuge' },
        { status: 500 }
      )
    }

    const spouse = {
      id: spouseId,
      email: authData.email || '',
      full_name: userData?.full_name || authData.user_metadata?.full_name || authData.email?.split('@')[0] || 'Cônjuge'
    }

    return NextResponse.json({ spouse })

  } catch (error) {
    console.error('Erro ao buscar cônjuge:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
