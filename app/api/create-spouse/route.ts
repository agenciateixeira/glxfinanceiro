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

    // Cria conta do cônjuge no Auth do Supabase
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma o email
      user_metadata: {
        full_name
      }
    })

    if (signUpError || !authData.user) {
      console.error('Erro ao criar usuário:', signUpError)
      return NextResponse.json(
        { error: signUpError?.message || 'Erro ao criar conta do cônjuge' },
        { status: 500 }
      )
    }

    // Adiciona nome completo na tabela users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
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
        user2_id: authData.user.id,
        created_by: user.id
      })

    if (linkError) {
      console.error('Erro ao vincular contas:', linkError)

      // Tenta deletar a conta criada se o vínculo falhou
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: 'Erro ao vincular contas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cônjuge cadastrado com sucesso!',
      spouse: {
        id: authData.user.id,
        email: authData.user.email,
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
