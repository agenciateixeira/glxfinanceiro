/**
 * Serviço para atualizar automaticamente os indicadores econômicos
 * do Banco Central do Brasil
 */

import { createClient } from '@/lib/supabase/client'
import { fetchCDI, fetchIPCA, fetchSelic, formatDateForBCB, calculateAccumulated12M } from '@/lib/economic-indicators'

interface IndicatorUpdate {
  reference_date: string
  cdi_rate: number | null
  ipca_rate: number | null
  selic_rate: number | null
  cdi_accumulated_12m: number | null
  ipca_accumulated_12m: number | null
  selic_accumulated_12m: number | null
}

/**
 * Atualiza os indicadores econômicos dos últimos N meses
 */
export async function updateEconomicIndicators(months: number = 12) {
  console.log(`📊 Iniciando atualização de indicadores dos últimos ${months} meses...`)

  const supabase = createClient()

  // Calcular período
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const startDateStr = formatDateForBCB(startDate)
  const endDateStr = formatDateForBCB(endDate)

  console.log(`📅 Período: ${startDateStr} até ${endDateStr}`)

  try {
    // Buscar dados da API do Banco Central
    console.log('🔄 Buscando dados do Banco Central...')
    const [cdiData, ipcaData, selicData] = await Promise.all([
      fetchCDI(startDateStr, endDateStr),
      fetchIPCA(startDateStr, endDateStr),
      fetchSelic(startDateStr, endDateStr)
    ])

    console.log(`✅ CDI: ${cdiData.length} registros`)
    console.log(`✅ IPCA: ${ipcaData.length} registros`)
    console.log(`✅ Selic: ${selicData.length} registros`)

    // Processar dados mensais
    const monthlyData: { [key: string]: IndicatorUpdate } = {}

    // Processar CDI (pegar último valor de cada mês)
    cdiData.forEach(item => {
      const [day, month, year] = item.data.split('/')
      const monthKey = `${year}-${month}-01`
      const value = parseFloat(item.valor.replace(',', '.'))

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          reference_date: monthKey,
          cdi_rate: null,
          ipca_rate: null,
          selic_rate: null,
          cdi_accumulated_12m: null,
          ipca_accumulated_12m: null,
          selic_accumulated_12m: null,
        }
      }

      monthlyData[monthKey].cdi_rate = value
    })

    // Processar IPCA
    ipcaData.forEach(item => {
      const [day, month, year] = item.data.split('/')
      const monthKey = `${year}-${month}-01`
      const value = parseFloat(item.valor.replace(',', '.'))

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          reference_date: monthKey,
          cdi_rate: null,
          ipca_rate: null,
          selic_rate: null,
          cdi_accumulated_12m: null,
          ipca_accumulated_12m: null,
          selic_accumulated_12m: null,
        }
      }

      monthlyData[monthKey].ipca_rate = value
    })

    // Processar Selic
    selicData.forEach(item => {
      const [day, month, year] = item.data.split('/')
      const monthKey = `${year}-${month}-01`
      const value = parseFloat(item.valor.replace(',', '.'))

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          reference_date: monthKey,
          cdi_rate: null,
          ipca_rate: null,
          selic_rate: null,
          cdi_accumulated_12m: null,
          ipca_accumulated_12m: null,
          selic_accumulated_12m: null,
        }
      }

      monthlyData[monthKey].selic_rate = value
    })

    // Calcular acumulados 12 meses
    const sortedMonths = Object.keys(monthlyData).sort()

    // CDI acumulado
    const cdiRates = sortedMonths.map(key => monthlyData[key].cdi_rate || 0)
    sortedMonths.forEach((key, index) => {
      const rates = cdiRates.slice(Math.max(0, index - 11), index + 1)
      monthlyData[key].cdi_accumulated_12m = calculateAccumulated12M(rates)
    })

    // IPCA acumulado
    const ipcaRates = sortedMonths.map(key => monthlyData[key].ipca_rate || 0)
    sortedMonths.forEach((key, index) => {
      const rates = ipcaRates.slice(Math.max(0, index - 11), index + 1)
      monthlyData[key].ipca_accumulated_12m = calculateAccumulated12M(rates)
    })

    // Selic acumulado
    const selicRates = sortedMonths.map(key => monthlyData[key].selic_rate || 0)
    sortedMonths.forEach((key, index) => {
      const rates = selicRates.slice(Math.max(0, index - 11), index + 1)
      monthlyData[key].selic_accumulated_12m = calculateAccumulated12M(rates)
    })

    // Inserir/atualizar no banco
    console.log('💾 Salvando no banco de dados...')
    const updates = Object.values(monthlyData)

    for (const update of updates) {
      const { error } = await supabase
        .from('economic_indicators')
        .upsert(update, { onConflict: 'reference_date' })

      if (error) {
        console.error(`❌ Erro ao salvar ${update.reference_date}:`, error.message)
      } else {
        console.log(`✅ ${update.reference_date} atualizado`)
      }
    }

    console.log(`\n🎉 Atualização concluída! ${updates.length} meses processados.`)

    return {
      success: true,
      monthsUpdated: updates.length,
      lastUpdate: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar indicadores:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Verifica se precisa atualizar os indicadores
 * (se o último registro tem mais de 30 dias)
 */
export async function shouldUpdateIndicators(): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('economic_indicators')
    .select('reference_date, updated_at')
    .order('reference_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    console.log('⚠️ Nenhum indicador encontrado, precisa atualizar')
    return true
  }

  // Verificar se o último registro foi atualizado há mais de 30 dias
  const lastUpdate = new Date(data.updated_at)
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))

  console.log(`📅 Último update: ${daysSinceUpdate} dias atrás`)

  return daysSinceUpdate > 30
}
