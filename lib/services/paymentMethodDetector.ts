/**
 * Detecta o método de pagamento baseado na descrição da transação
 */

export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'bank_transfer' | 'other'

export function detectPaymentMethod(description: string): PaymentMethod {
  const lowerDesc = description.toLowerCase()

  // PIX - mais comum primeiro
  if (
    lowerDesc.includes('pix') ||
    lowerDesc.includes('transferência recebida pelo pix') ||
    lowerDesc.includes('transferência enviada pelo pix')
  ) {
    return 'pix'
  }

  // Débito
  if (
    lowerDesc.includes('débito') ||
    lowerDesc.includes('debito') ||
    lowerDesc.includes('compra no débito') ||
    lowerDesc.includes('compra no debito') ||
    lowerDesc.includes('débito via') ||
    lowerDesc.includes('debito via')
  ) {
    return 'debit_card'
  }

  // Transferência bancária
  if (
    lowerDesc.includes('transferência') ||
    lowerDesc.includes('transferencia') ||
    lowerDesc.includes('ted') ||
    lowerDesc.includes('doc') ||
    lowerDesc.includes('transferência recebida') ||
    lowerDesc.includes('transferência enviada')
  ) {
    return 'bank_transfer'
  }

  // Dinheiro/Saque
  if (
    lowerDesc.includes('saque') ||
    lowerDesc.includes('dinheiro') ||
    lowerDesc.includes('espécie') ||
    lowerDesc.includes('especie')
  ) {
    return 'cash'
  }

  // Pagamento de fatura (geralmente cartão de crédito)
  if (
    lowerDesc.includes('pagamento de fatura') ||
    lowerDesc.includes('fatura')
  ) {
    return 'credit_card'
  }

  // Crédito
  if (
    lowerDesc.includes('crédito') ||
    lowerDesc.includes('credito') ||
    lowerDesc.includes('compra no crédito') ||
    lowerDesc.includes('compra no credito')
  ) {
    return 'credit_card'
  }

  // Boleto
  if (
    lowerDesc.includes('boleto') ||
    lowerDesc.includes('código de barras') ||
    lowerDesc.includes('codigo de barras')
  ) {
    return 'other'
  }

  // Padrão: cartão de crédito
  return 'credit_card'
}
