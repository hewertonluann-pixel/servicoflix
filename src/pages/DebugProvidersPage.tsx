import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Search, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react'

const OWNER_UID = 'Glhzl4mWRkNjttVBLaLhoUWLWxf1'

interface ProviderDebug {
  id: string
  name: string
  email: string
  roles: string[]
  status?: string
  diasScore?: number
  subscriptionStatus?: string
  city?: string
  category?: string
  categories?: string[]
  specialty?: string
  featured?: boolean
  verified?: boolean
  isOwner: boolean
  visibleOnHome: boolean
  issues: string[]
}

const VALID_STATUSES = ['ativo', 'approved']

export const DebugProvidersPage = () => {
  const [providers, setProviders] = useState<ProviderDebug[]>([])
  const [loading, setLoading] = useState(true)

  const loadProviders = async () => {
    try {
      setLoading(true)
      const usersSnap = await getDocs(collection(db, 'users'))
      const debugData: ProviderDebug[] = []

      usersSnap.docs.forEach(d => {
        const data = d.data()
        if (!data.providerProfile) return

        const issues: string[] = []
        const p = data.providerProfile || {}
        const isOwner = d.id === OWNER_UID

        // --- Validação de status ---
        const status = p.status
        if (!status) {
          issues.push('⚠️ Status não definido em providerProfile')
        } else if (!VALID_STATUSES.includes(status)) {
          issues.push(`❌ Status inválido para exibição na Home: "${status}" (esperado: "ativo" ou "approved")`)
        }

        // --- Validação de role ---
        if (!data.roles?.includes('provider')) {
          issues.push('❌ Role "provider" faltando em roles[]')
        }

        // --- Validação de diasScore (raiz do doc users) ---
        const diasScore = typeof data.diasScore === 'number' ? data.diasScore : undefined
        const subscriptionStatus = p.subscriptionStatus
        const hasActiveScore = (typeof diasScore === 'number' && diasScore > 0)
        const hasActiveSub = subscriptionStatus === 'active'

        if (!isOwner && !hasActiveScore && !hasActiveSub) {
          issues.push(
            diasScore === undefined
              ? '⏳ diasScore não encontrado na raiz do documento (users/{id})'
              : `⏳ diasScore = ${diasScore} — prestador não aparece na Home (necessário > 0)`
          )
        }

        // --- Validação de categoria ---
        const hasCategory = p.category || p.categories?.length > 0
        if (!hasCategory) {
          issues.push('💭 Categoria não definida')
        }

        // --- Validação de cidade ---
        if (!p.city) {
          issues.push('🏛️ Cidade não definida')
        }

        // --- Visível na Home? ---
        const statusOk = isOwner || VALID_STATUSES.includes(status)
        const roleOk = isOwner || data.roles?.includes('provider')
        const ativoOk = isOwner || hasActiveScore || hasActiveSub
        const visibleOnHome = statusOk && roleOk && ativoOk

        debugData.push({
          id: d.id,
          name: p.professionalName || data.name || 'Sem nome',
          email: data.email || '',
          roles: data.roles || [],
          status,
          diasScore,
          subscriptionStatus,
          city: p.city,
          category: p.category,
          categories: p.categories,
          specialty: p.specialty,
          featured: p.featured,
          verified: p.verified,
          isOwner,
          visibleOnHome,
          issues,
        })
      })

      debugData.sort((a, b) => b.issues.length - a.issues.length)
      setProviders(debugData)
    } catch (err) {
      console.error('Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProviders() }, [])

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    if (VALID_STATUSES.includes(status)) return 'text-green-400 bg-green-500/10 border-green-500/30'
    if (status === 'pending') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  const getStatusIcon = (status?: string) => {
    if (!status) return <Search className="w-4 h-4" />
    if (VALID_STATUSES.includes(status)) return <CheckCircle className="w-4 h-4" />
    if (status === 'pending') return <AlertCircle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
  }

  const total = providers.length
  const visiveis = providers.filter(p => p.visibleOnHome).length
  const withIssues = providers.filter(p => p.issues.length > 0).length
  const semScore = providers.filter(p => !p.isOwner && !p.subscriptionStatus && (p.diasScore === undefined || p.diasScore <= 0)).length
  const noCategory = providers.filter(p => !p.category && !p.categories?.length).length
  const noCity = providers.filter(p => !p.city).length

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted">Carregando diagnóstico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                🔍 Diagnóstico de Prestadores
              </h1>
              <p className="text-muted text-sm">Verificação completa dos dados em <code className="text-primary">users/</code> no Firestore</p>
            </div>
            <button
              onClick={loadProviders}
              className="px-4 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Total</p>
              <p className="text-2xl font-black text-white">{total}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Visíveis na Home</p>
              <p className="text-2xl font-black text-green-400">{visiveis}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Com Problemas</p>
              <p className="text-2xl font-black text-red-400">{withIssues}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Sem diasScore</p>
              <p className="text-2xl font-black text-yellow-400">{semScore}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Sem Categoria</p>
              <p className="text-2xl font-black text-orange-400">{noCategory}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Sem Cidade</p>
              <p className="text-2xl font-black text-purple-400">{noCity}</p>
            </div>
          </div>
        </div>

        {/* Lista de prestadores */}
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`bg-surface border rounded-xl p-4 sm:p-6 ${
                provider.issues.length > 0 ? 'border-red-500/30' : 'border-border'
              }`}
            >
              {/* Cabeçalho do card */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-white truncate">{provider.name}</h3>
                    {provider.isOwner && (
                      <span className="px-2 py-0.5 bg-primary/20 border border-primary/40 text-primary rounded text-xs font-bold shrink-0">OWNER</span>
                    )}
                  </div>
                  <p className="text-sm text-muted truncate">{provider.email}</p>
                  <p className="text-xs text-muted mt-1">ID: {provider.id}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(provider.status)}`}>
                    {getStatusIcon(provider.status)}
                    {provider.status || 'indefinido'}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    provider.visibleOnHome
                      ? 'text-green-400 bg-green-500/10 border-green-500/30'
                      : 'text-red-400 bg-red-500/10 border-red-500/30'
                  }`}>
                    {provider.visibleOnHome ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {provider.visibleOnHome ? 'Visível na Home' : 'Oculto na Home'}
                  </div>
                </div>
              </div>

              {/* Informações detalhadas */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.roles.length > 0 ? (
                      provider.roles.map((role, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-red-400">Nenhuma</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Categoria</p>
                  <p className={`text-sm font-semibold ${
                    provider.category || provider.categories?.length ? 'text-white' : 'text-red-400'
                  }`}>
                    {provider.category || provider.categories?.[0] || '❌ Não definida'}
                  </p>
                  {provider.categories && provider.categories.length > 1 && (
                    <p className="text-xs text-muted mt-1">+{provider.categories.length - 1} mais</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Cidade</p>
                  <p className={`text-sm font-semibold ${
                    provider.city ? 'text-white' : 'text-red-400'
                  }`}>
                    {provider.city || '❌ Não definida'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Especialidade</p>
                  <p className="text-sm font-semibold text-white truncate">
                    {provider.specialty || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">diasScore <span className="text-muted/60">(raiz users/)</span></p>
                  <p className={`text-sm font-black ${
                    provider.isOwner ? 'text-primary'
                    : provider.diasScore !== undefined && provider.diasScore > 0 ? 'text-green-400'
                    : provider.subscriptionStatus === 'active' ? 'text-blue-400'
                    : 'text-red-400'
                  }`}>
                    {provider.isOwner
                      ? '∞ (owner)'
                      : provider.subscriptionStatus === 'active'
                      ? '🔄 Assinatura ativa'
                      : provider.diasScore !== undefined
                      ? `${provider.diasScore} dias`
                      : '❌ Não encontrado'
                    }
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {provider.featured && (
                  <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-semibold">
                    ⭐ Em Destaque
                  </span>
                )}
                {provider.verified && (
                  <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-semibold">
                    ✔️ Verificado
                  </span>
                )}
              </div>

              {/* Problemas detectados */}
              {provider.issues.length > 0 ? (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-xs font-semibold mb-2">
                    🚨 {provider.issues.length} problema(s) detectado(s):
                  </p>
                  <ul className="space-y-1">
                    {provider.issues.map((issue, idx) => (
                      <li key={idx} className="text-red-300 text-xs flex items-start gap-2">
                        <span className="shrink-0">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Tudo OK! Prestador configurado corretamente e visível na Home.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Nenhum prestador encontrado</h3>
            <p className="text-muted text-sm">Não há usuários com providerProfile no Firestore.</p>
          </div>
        )}
      </div>
    </div>
  )
}
