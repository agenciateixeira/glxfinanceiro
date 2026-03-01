/**
 * Extrai o nome de pessoa de descrições de transações
 * Procura por padrões comuns em extratos bancários
 */

export function extractPersonName(description: string): string | null {
  // Remove espaços extras
  const cleaned = description.trim()

  // Padrão 1: "Transferência recebida pelo Pix - NOME COMPLETO - CPF"
  // Padrão 2: "Transferência enviada pelo Pix - NOME COMPLETO - CPF"
  const pixPattern = /(?:Transferência (?:recebida|enviada) pelo Pix|Pix)\s*-\s*([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s*-\s*(?:•|\*|\d)|$)/i
  const pixMatch = cleaned.match(pixPattern)

  if (pixMatch && pixMatch[1]) {
    const name = pixMatch[1].trim()
    // Valida se parece um nome (pelo menos 2 palavras)
    if (name.split(/\s+/).length >= 2) {
      // Capitaliza corretamente
      return capitalizeName(name)
    }
  }

  // Padrão 3: "PIX ENVIADO - NOME COMPLETO"
  const pixEnviadoPattern = /PIX\s+(?:ENVIADO|RECEBIDO)\s+(?:-\s+)?([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s*(?:CPF|CNPJ|-)|\s*$)/i
  const pixEnviadoMatch = cleaned.match(pixEnviadoPattern)

  if (pixEnviadoMatch && pixEnviadoMatch[1]) {
    const name = pixEnviadoMatch[1].trim()
    if (name.split(/\s+/).length >= 2) {
      return capitalizeName(name)
    }
  }

  // Padrão 4: Nome após " - " em maiúsculas
  const dashPattern = /\s-\s([A-ZÀ-Ú][A-ZÀ-Ú\s]{10,}?)(?:\s-|\s•|\s\*|\sCPF|\sCNPJ|$)/
  const dashMatch = cleaned.match(dashPattern)

  if (dashMatch && dashMatch[1]) {
    const name = dashMatch[1].trim()
    // Remove palavras que não são nomes
    const filtered = name.split(/\s+/).filter(word =>
      !word.match(/^(SA|LTDA|ME|EIRELI|EPP|BANCO|AGENCIA|CONTA|CPF|CNPJ|\d+)$/i)
    ).join(' ')

    if (filtered.split(/\s+/).length >= 2) {
      return capitalizeName(filtered)
    }
  }

  return null
}

/**
 * Capitaliza nome corretamente
 * Exemplo: "JOÃO DA SILVA" -> "João da Silva"
 */
function capitalizeName(name: string): string {
  // Preposições e artigos que devem ficar em minúscula
  const lowercase = ['da', 'de', 'do', 'das', 'dos', 'e', 'em']

  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Primeira palavra sempre maiúscula
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }

      // Preposições e artigos em minúscula, exceto se for iniciais (ex: "S.A.")
      if (lowercase.includes(word.toLowerCase()) && !word.includes('.')) {
        return word.toLowerCase()
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Gera uma cor consistente baseada no nome
 */
export function getColorForName(name: string): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
  ]

  // Gera hash simples do nome
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}
