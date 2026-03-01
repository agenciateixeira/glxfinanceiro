'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function DebugSpousePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [results, setResults] = useState<any>({})

  useEffect(() => {
    if (!user) return

    async function runTests() {
      const testResults: any = {
        userId: user.id,
        userEmail: user.email,
      }

      // 1. Verificar vínculo
      const { data: link, error: linkError } = await supabase
        .from('shared_accounts')
        .select('*')

      testResults.link = { data: link, error: linkError }

      // 2. Testar query de transações SEM filtro
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('id, description, user_id')

      testResults.allTransactions = {
        count: allTransactions?.length || 0,
        data: allTransactions,
        error: allError
      }

      // 3. Testar query de categorias
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, user_id')

      testResults.categories = {
        count: categories?.length || 0,
        data: categories,
        error: catError
      }

      // 4. Testar query de tags
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, name, user_id')

      testResults.tags = {
        count: tags?.length || 0,
        data: tags,
        error: tagsError
      }

      // 5. Verificar sessão
      const { data: session } = await supabase.auth.getSession()
      testResults.session = {
        userId: session.session?.user?.id,
        email: session.session?.user?.email,
      }

      setResults(testResults)
    }

    runTests()
  }, [user])

  if (!user) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug: Compartilhamento de Cônjuge</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Usuário Atual</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({ userId: results.userId, userEmail: results.userEmail }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Sessão</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(results.session, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Vínculo (shared_accounts)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(results.link, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Transações (via RLS)</h2>
          <p className="text-sm mb-2">
            Quantidade: <strong>{results.allTransactions?.count || 0}</strong>
          </p>
          <pre className="text-xs overflow-auto max-h-64">
            {JSON.stringify(results.allTransactions, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Categorias (via RLS)</h2>
          <p className="text-sm mb-2">
            Quantidade: <strong>{results.categories?.count || 0}</strong>
          </p>
          <pre className="text-xs overflow-auto max-h-64">
            {JSON.stringify(results.categories, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Tags (via RLS)</h2>
          <p className="text-sm mb-2">
            Quantidade: <strong>{results.tags?.count || 0}</strong>
          </p>
          <pre className="text-xs overflow-auto max-h-64">
            {JSON.stringify(results.tags, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900 rounded">
        <h3 className="font-semibold mb-2">Interpretação:</h3>
        <ul className="text-sm space-y-2">
          <li>✅ Se vínculo existe: As políticas RLS devem permitir acesso</li>
          <li>✅ Se transações aparecem: RLS está funcionando</li>
          <li>❌ Se transações = 0: Problema com políticas RLS ou com auth.uid()</li>
          <li>⚠️ Se error não é null: Há um problema de permissão</li>
        </ul>
      </div>
    </div>
  )
}
