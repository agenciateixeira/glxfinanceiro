import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
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

    // Busca o vínculo
    const { data: link } = await supabase
      .from('shared_accounts')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single()

    if (!link) {
      return NextResponse.json(
        { error: 'Nenhum cônjuge vinculado' },
        { status: 404 }
      )
    }

    // Identifica o ID do cônjuge
    const spouseId = link.user1_id === user.id ? link.user2_id : link.user1_id

    // Deleta o vínculo
    const { error: deleteError } = await supabase
      .from('shared_accounts')
      .delete()
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (deleteError) {
      console.error('Erro ao deletar vínculo:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao desvincular cônjuge' },
        { status: 500 }
      )
    }

    // Opcionalmente, deleta a conta do cônjuge também
    // (comentado por segurança - só descomente se tiver certeza)
    /*
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (supabaseServiceKey) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${spouseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        }
      })
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Cônjuge desvinculado com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao deletar vínculo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
