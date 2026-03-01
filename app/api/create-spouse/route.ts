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

    // Lê dados do cônjuge
    const { email, password, full_name } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, senha e nome completo são obrigatórios' },
        { status: 400 }
      )
    }

    // Verifica se usuário já tem cônjuge vinculado
    const { data: existingLink } = await supabase
      .from('shared_accounts')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single()

    if (existingLink) {
      return NextResponse.json(
        { error: 'Você já tem um cônjuge vinculado' },
        { status: 400 }
      )
    }

    // Usar fetch direto para a API do Supabase para não afetar a sessão atual
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Cria usuário diretamente via API Admin do Supabase
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name
        }
      })
    })

    const authData = await createUserResponse.json()

    if (!createUserResponse.ok || !authData.id) {
      console.error('Erro ao criar usuário:', authData)
      return NextResponse.json(
        { error: authData.msg || authData.error_description || 'Erro ao criar conta do cônjuge' },
        { status: 500 }
      )
    }

    const newUserId = authData.id

    // Adiciona nome completo na tabela users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email: authData.email,
        full_name
      })

    if (userError) {
      console.error('Erro ao inserir dados do usuário:', userError)
      // Continua mesmo com erro, pois o auth já foi criado
    }

    // Cria vínculo entre as contas
    const { error: linkError } = await supabase
      .from('shared_accounts')
      .insert({
        user1_id: user.id,
        user2_id: newUserId,
        created_by: user.id
      })

    if (linkError) {
      console.error('Erro ao vincular contas:', linkError)

      return NextResponse.json(
        { error: 'Erro ao vincular contas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cônjuge cadastrado com sucesso!',
      spouse: {
        id: newUserId,
        email: authData.email,
        full_name
      }
    })

  } catch (error) {
    console.error('Erro ao criar cônjuge:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
