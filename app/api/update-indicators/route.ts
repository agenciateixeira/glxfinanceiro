import { NextResponse } from 'next/server'
import { updateEconomicIndicators, shouldUpdateIndicators } from '@/lib/services/updateEconomicIndicators'

/**
 * API endpoint para atualizar indicadores econômicos
 *
 * GET /api/update-indicators - Verifica se precisa atualizar e atualiza se necessário
 * POST /api/update-indicators - Força atualização imediata
 */

export async function GET() {
  try {
    console.log('🔍 Verificando se precisa atualizar indicadores...')

    const needsUpdate = await shouldUpdateIndicators()

    if (!needsUpdate) {
      return NextResponse.json({
        success: true,
        message: 'Indicadores já estão atualizados',
        updated: false
      })
    }

    console.log('📊 Atualizando indicadores...')
    const result = await updateEconomicIndicators(24) // Últimos 24 meses

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `${result.monthsUpdated} meses atualizados com sucesso`
        : 'Erro ao atualizar indicadores',
      updated: true,
      data: result
    })

  } catch (error) {
    console.error('❌ Erro na API de atualização:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao atualizar indicadores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    console.log('🔄 Forçando atualização de indicadores...')

    const result = await updateEconomicIndicators(24) // Últimos 24 meses

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `${result.monthsUpdated} meses atualizados com sucesso`
        : 'Erro ao atualizar indicadores',
      data: result
    })

  } catch (error) {
    console.error('❌ Erro na API de atualização:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao atualizar indicadores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
