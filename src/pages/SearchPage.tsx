import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { mockProviders, MockProvider } from '@/data/mock'
import { ProviderCard } from '@/components/ProviderCard'

const VALID_STATUSES = ['approved', 'ativo']

// Retorna true se o prestador tem acesso ativo (score > 0 OU assinatura ativa)
const isProviderActive = (data: any): boolean => {
  const p = data.providerProfile || {}
  if (p.subscriptionStatus === 'active') return true
  const scoreExpiry = p.scoreExpiresAt
  if (scoreExpiry) {
    const expiry = scoreExpiry?.toDate ? scoreExpiry.toDate() : new Date(scoreExpiry)
    if (expiry > new Date()) return true
  }
  return false
}

/**
 * Resolve o categoryId do prestador comparando os valores que ele
 * salvou (texto livre, slug ou ID) com a lista de categorias do Firestore.
 * Estratégia (em ordem de prioridade):
 *  1. Valor já é um ID direto de categoria → usa ele
 *  2. Valor bate com o `name` (case-insensitive) de alguma categoria → usa o ID correspondente
 *  3. Fallback → devolve o valor bruto em lowercase para não quebrar
 */
const resolveCategoryId = (
  raw: string,
  categoryMap: Map<string, string> // id → name
): string => {
  const lower = raw.toLowerCase().trim()
  // Caso 1: já é um ID conhecido
  if (categoryMap.has(lower)) return lower
  // Caso 2: bate com algum nome
  for (const [id, name] of categoryMap.entries()) {
    if (name.toLowerCase().trim() === lower) return id
    // correspondência parcial (ex: "faxineira" dentro de "Limpeza Residencial")
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return id
  }
  return lower
}

const docToProvider = (
  id: string,
  data: any,
  categoryMap: Map<string, string>
): MockProvider => {
  const rawCategory =
    data.providerProfile?.categoryId ||
    data.providerProfile?.categories?.[0] ||
    data.providerProfile?.category ||
    'outros'

  return {
    id,
    name: data.providerProfile?.professionalName || data.name || 'Sem nome',
    avatar: data.avatar || `https://i.pravatar.cc/150?u=${id}`,
    coverImage:
      data.providerProfile?.coverImage ||
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    specialty: data.providerProfile?.specialty || 'Profissional',
    category: resolveCategoryId(rawCategory, categoryMap),
    rating: data.providerProfile?.rating || 5.0,
    reviewCount: data.providerProfile?.reviewCount || 0,
    priceFrom: parseFloat(data.providerProfile?.priceFrom) || 50,
    city: data.providerProfile?.city || '',
    neighborhood:
      data.providerProfile?.neighborhood || data.providerProfile?.city || '',
    isOnline: data.providerProfile?.isOnline === true,
    isTopRated: data.providerProfile?.verified || false,
    isFeatured: data.providerProfile?.featured || false,
    bio: data.providerProfile?.bio || '',
    skills: data.providerProfile?.skills || [],
    completedJobs: data.providerProfile?.completedJobs || 0,
    responseTime: data.providerProfile?.responseTime || '< 24h',
    whatsapp: data.providerProfile?.whatsapp || '',
    isMock: false,
  }
}

export const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('categoria') || ''
  )
  const [allProviders, setAllProviders] = useState<MockProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([])

  useEffect(() => {
    const load = async () => {
      try {
        // Carrega categorias PRIMEIRO para montar o mapa id → name
        const catSnap = await getDocs(collection(db, 'categories'))
        const cats = catSnap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter((c: any) => c.active)
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
        setCategories(cats)

        // Mapa id → name usado para normalizar categorias dos prestadores
        const categoryMap = new Map<string, string>(
          cats.map((c: any) => [c.id, c.name])
        )

        // Carrega prestadores
        const snap = await getDocs(collection(db, 'users'))
        const reais: MockProvider[] = []

        snap.docs.forEach(d => {
          const data = d.data()
          if (
            data.roles?.includes('provider') &&
            VALID_STATUSES.includes(data.providerProfile?.status) &&
            isProviderActive(data)
          ) {
            reais.push(docToProvider(d.id, data, categoryMap))
          }
        })

        const mocksFiltered = mockProviders.filter(p => {
          if (!p.isMock) return true
          const countReal = reais.filter(r => r.category === p.category).length
          return countReal < 5
        })

        setAllProviders([...reais, ...mocksFiltered.filter(p => p.isMock)])
      } catch (err) {
        console.warn('Fallback para mocks:', err)
        setAllProviders(mockProviders)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = allProviders.filter(p => {
    const q = query.toLowerCase()
    const matchQuery =
      query === '' ||
      p.name.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q) ||
      p.skills?.some(s => s.toLowerCase().includes(q))
    const matchCat = selectedCategory === '' || p.category === selectedCategory
    return matchQuery && matchCat
  })

  const realCount = filtered.filter(p => !p.isMock).length
  const mockCount = filtered.filter(p => p.isMock).length

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-black mb-6">Explorar Profissionais</h1>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por serviço, habilidade ou profissional..."
              className="bg-transparent text-white text-sm placeholder:text-muted outline-none w-full"
            />
          </div>
          <button className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 text-muted hover:text-white transition-colors text-sm">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scroll-smooth-x pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedCategory === ''
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-white border border-border'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-background'
                  : 'bg-surface text-muted hover:text-white border border-border'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-muted text-sm">
              {realCount > 0 && (
                <span className="text-white font-semibold">
                  {realCount} real{realCount > 1 ? 'is' : ''}
                </span>
              )}
              {realCount > 0 && mockCount > 0 && (
                <span className="text-muted"> + </span>
              )}
              {mockCount > 0 && (
                <span className="text-red-400 text-sm">
                  {mockCount} exemplo{mockCount > 1 ? 's' : ''}
                </span>
              )}
              {filtered.length === 0 && 'Nenhum profissional encontrado'}
            </p>
            {mockCount > 0 && (
              <span className="text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                Exemplos sumirão conforme chegam reais
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {filtered.map((provider, i) => (
              <ProviderCard key={provider.id} provider={provider} index={i} />
            ))}
            {filtered.length === 0 && (
              <div className="w-full text-center py-20 text-muted">
                <p className="text-lg mb-2">Nenhum profissional encontrado</p>
                <p className="text-sm">Tente buscar com outros termos</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
