import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Check, AlertCircle, RefreshCw } from 'lucide-react'

interface ProviderToFix {
  id: string
  name: string
  email: string
  specialty: string
  city: string
  currentCategory?: string
}

const CATEGORIES = [
  { id: 'musica', name: '🎵 Música', keywords: ['música', 'musical', 'banda', 'orquestra', 'dj', 'cantor', 'som'] },
  { id: 'educacao', name: '📚 Educação', keywords: ['professor', 'aula', 'ensino', 'educação', 'curso', 'tutor'] },
  { id: 'limpeza', name: '🧹 Limpeza', keywords: ['limpeza', 'faxina', 'diarista', 'limpador'] },
  { id: 'reformas', name: '🏠 Reformas', keywords: ['reforma', 'pedreiro', 'pintor', 'marceneiro', 'eletricista', 'encanador'] },
  { id: 'saude', name: '💊 Saúde', keywords: ['saúde', 'médico', 'enfermeiro', 'fisioterapeuta', 'dentista'] },
  { id: 'beleza', name: '💅 Beleza', keywords: ['cabelo', 'manicure', 'pedicure', 'estética', 'maquiagem'] },
  { id: 'tecnologia', name: '💻 Tecnologia', keywords: ['programador', 'desenvolvedor', 'ti', 'suporte', 'web', 'app'] },
  { id: 'eventos', name: '🎉 Eventos', keywords: ['evento', 'festa', 'casamento', 'buffet', 'decoração'] },
  { id: 'fotografia', name: '📸 Fotografia', keywords: ['foto', 'fotografia', 'fotógrafo', 'câmera'] },
  { id: 'transporte', name: '🚗 Transporte', keywords: ['motorista', 'entrega', 'transporte', 'mudanca'] },
  { id: 'consultoria', name: '💼 Consultoria', keywords: ['consultor', 'consultoria', 'assessoria', 'gestão'] },
  { id: 'outros', name: '🔧 Outros', keywords: [] },
]

export const FixProvidersPage = () => {
  const [providers, setProviders] = useState<ProviderToFix[]>([])
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState<string | null>(null)
  const [fixed, setFixed] = useState<string[]>([])

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const usersSnap = await getDocs(collection(db, 'users'))
      const toFix: ProviderToFix[] = []

      usersSnap.docs.forEach(d => {
        const data = d.data()
        
        // Busca prestadores sem categoria
        if (data.providerProfile && !data.providerProfile.category) {
          toFix.push({
            id: d.id,
            name: data.providerProfile?.professionalName || data.name || 'Sem nome',
            email: data.email || '',
            specialty: data.providerProfile?.specialty || '',
            city: data.providerProfile?.city || '',
            currentCategory: data.providerProfile?.category,
          })
        }
      })

      setProviders(toFix)
      console.log(`🔧 Prestadores sem categoria: ${toFix.length}`)
    } catch (err) {
      console.error('Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }

  // Sugere categoria baseada na especialidade
  const suggestCategory = (specialty: string): string => {
    const normalized = specialty.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    for (const cat of CATEGORIES) {
      for (const keyword of cat.keywords) {
        if (normalized.includes(keyword)) {
          return cat.id
        }
      }
    }

    return 'outros'
  }

  const fixProvider = async (providerId: string, categoryId: string) => {
    try {
      setFixing(providerId)
      const userRef = doc(db, 'users', providerId)
      
      await updateDoc(userRef, {
        'providerProfile.category': categoryId,
      })

      console.log(`✅ Categoria atualizada para: ${categoryId}`)
      setFixed(prev => [...prev, providerId])
      
      // Remove da lista
      setProviders(prev => prev.filter(p => p.id !== providerId))
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      alert('Erro ao atualizar categoria: ' + err)
    } finally {
      setFixing(null)
    }
  }

  const fixAll = async () => {
    if (!confirm(`Deseja atualizar automaticamente a categoria de ${providers.length} prestadores?`)) return

    for (const provider of providers) {
      const suggestedCategory = suggestCategory(provider.specialty)
      await fixProvider(provider.id, suggestedCategory)
      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    alert(`✅ ${providers.length} prestadores atualizados com sucesso!`)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted">Carregando prestadores...</p>
        </div>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">✅ Tudo certo!</h3>
          <p className="text-muted text-sm mb-6">Todos os prestadores já têm categoria definida.</p>
          {fixed.length > 0 && (
            <p className="text-green-400 text-sm">
              ✨ {fixed.length} prestador(es) corrigido(s) nesta sessão.
            </p>
          )}
          <button
            onClick={() => window.location.href = '/debug'}
            className="mt-6 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Voltar para Debug
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                🔧 Corrigir Categorias
              </h1>
              <p className="text-muted text-sm">Atribua categorias aos prestadores sem classificação</p>
            </div>
            <button
              onClick={fixAll}
              disabled={fixing !== null}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✨ Corrigir Todos
            </button>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-semibold mb-1">
                  {providers.length} prestador(es) sem categoria
                </p>
                <p className="text-yellow-300 text-xs">
                  Prestadores sem categoria não aparecem nas listagens da home. Selecione a categoria apropriada para cada um.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de prestadores */}
        <div className="space-y-4">
          {providers.map((provider) => {
            const suggestedCategory = suggestCategory(provider.specialty)
            const suggested = CATEGORIES.find(c => c.id === suggestedCategory)

            return (
              <div
                key={provider.id}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-black text-white mb-1">{provider.name}</h3>
                  <p className="text-sm text-muted mb-2">{provider.email}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-primary font-semibold">{provider.specialty}</span>
                    <span className="text-muted">•</span>
                    <span className="text-muted">{provider.city}</span>
                  </div>
                </div>

                {/* Sugestão automática */}
                {suggested && suggested.id !== 'outros' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <p className="text-blue-400 text-xs font-semibold mb-2">
                      🤖 Sugestão automática baseada na especialidade:
                    </p>
                    <button
                      onClick={() => fixProvider(provider.id, suggested.id)}
                      disabled={fixing === provider.id}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {fixing === provider.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {suggested.name}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Seleção manual */}
                <div>
                  <p className="text-xs text-muted mb-2 font-semibold">Ou escolha manualmente:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => fixProvider(provider.id, cat.id)}
                        disabled={fixing === provider.id}
                        className="px-3 py-2 bg-surface border border-border hover:border-primary hover:text-primary text-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
