import { useEffect, useState } from 'react'
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useCityFilter } from '@/components/CitySelectorNav'
import { HeroBillboard } from '@/components/HeroBillboard'
import { CategoryRow } from '@/components/CategoryRow'
import { CategoryGrid } from '@/components/CategoryGrid'
import { FilterBar, Filters } from '@/components/FilterBar'
import { mockProviders, mocksByCategory, MockProvider } from '@/data/mock'

const OWNER_UID = 'Glhzl4mWRkNjttVBLaLhoUWLWxf1'

interface Category {
  id: string
  name: string
  icon: string
  active: boolean
}

interface MockSettings {
  [categoryId: string]: boolean
}

// ✅ Retorna true se o prestador tem acesso ativo (diasScore > 0 OU assinatura ativa)
const isProviderActive = (data: any): boolean => {
  const p = data.providerProfile || {}
  // Owner sempre ativo
  if (data.id === OWNER_UID) return true
  // Assinatura mensal ativa
  if (p.subscriptionStatus === 'active') return true
  // diasScore fica na raiz do documento users (não dentro de providerProfile)
  const diasScore = data.diasScore
  if (typeof diasScore === 'number' && diasScore > 0) return true
  // Compatibilidade: scoreExpiresAt dentro de providerProfile
  const scoreExpiry = p.scoreExpiresAt
  if (scoreExpiry) {
    const expiry = scoreExpiry?.toDate ? scoreExpiry.toDate() : new Date(scoreExpiry)
    if (expiry > new Date()) return true
  }
  return false
}

const docToProvider = (id: string, data: any): MockProvider => ({
  id,
  name: data.providerProfile?.professionalName || data.name || 'Sem nome',
  avatar: data.providerProfile?.avatar || data.avatar || '',
  coverImage: data.providerProfile?.coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
  specialty: data.providerProfile?.specialty || 'Profissional',
  category: (data.providerProfile?.categories?.[0] || data.providerProfile?.category || 'outros').toLowerCase(),
  rating: data.providerProfile?.rating || 5.0,
  reviewCount: data.providerProfile?.reviewCount || 0,
  priceFrom: parseFloat(data.providerProfile?.priceFrom) || 50,
  city: data.providerProfile?.city || '',
  neighborhood: data.providerProfile?.neighborhood || data.providerProfile?.city || '',
  isOnline: data.providerProfile?.isOnline === true,
  isTopRated: data.providerProfile?.verified || false,
  isFeatured: data.providerProfile?.featured || id === OWNER_UID,
  bio: data.providerProfile?.bio || '',
  skills: data.providerProfile?.skills || [],
  completedJobs: data.providerProfile?.completedJobs || 0,
  responseTime: data.providerProfile?.responseTime || '< 24h',
  whatsapp: data.providerProfile?.whatsapp || '',
  isMock: false,
})

export const HomePage = () => {
  const { user } = useSimpleAuth()
  const { cityFilter, showAllCities } = useCityFilter()
  const [realProviders, setRealProviders] = useState<MockProvider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)
  const [mockSettings, setMockSettings] = useState<MockSettings>({})
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: { min: 0, max: 1000 },
    searchRadius: 50,
    onlyVerified: false,
    minRating: 0,
  })

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'mockups'), (snap) => {
      if (snap.exists()) {
        setMockSettings(snap.data().categories || {})
      } else {
        const defaultSettings: MockSettings = {}
        Object.keys(mocksByCategory).forEach(cat => {
          defaultSettings[cat] = true
        })
        setMockSettings(defaultSettings)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'))
        const providers: MockProvider[] = []

        usersSnap.docs.forEach(d => {
          const data = d.data()

          if (!data.providerProfile) return

          const isOwner = d.id === OWNER_UID
          // Aceita 'approved' (legado) e 'ativo' (novo padrão)
          const isApproved =
            data.roles?.includes('provider') &&
            ['approved', 'ativo'].includes(data.providerProfile?.status)

          // Só exibe se tiver score/assinatura ativo
          const ativo = isOwner || isProviderActive({ ...data, id: d.id })

          if ((isOwner || isApproved) && ativo) {
            const provider = docToProvider(d.id, data)
            providers.push(provider)
          }
        })

        setRealProviders(providers)

        const catSnap = await getDocs(collection(db, 'categories'))
        const cats: Category[] = catSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Category))
          .filter(c => c.active)
          .sort((a, b) => a.name.localeCompare(b.name))

        setCategories(cats)
      } catch (err) {
        console.warn('Erro ao carregar dados:', err)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (user?.settings?.preferences) {
      setFilters({
        categories: user.settings.preferences.favoriteCategories || [],
        priceRange: user.settings.preferences.priceRange || { min: 0, max: 1000 },
        searchRadius: user.settings.preferences.searchRadius || 50,
        onlyVerified: user.settings.preferences.onlyVerified || false,
        minRating: user.settings.preferences.minRating || 0,
      })
    }
  }, [user])

  const applyFilters = (providers: MockProvider[]): MockProvider[] => {
    return providers.filter(p => {
      if (!showAllCities && cityFilter && p.city) {
        const normalizeCity = (city: string) =>
          city.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()

        if (normalizeCity(p.city) !== normalizeCity(cityFilter)) {
          return false
        }
      }

      if (filters.categories.length > 0 && !filters.categories.includes(p.category)) {
        return false
      }

      if (p.priceFrom < filters.priceRange.min || p.priceFrom > filters.priceRange.max) {
        return false
      }

      if (filters.onlyVerified && !p.isTopRated) {
        return false
      }

      if (p.rating < filters.minRating) {
        return false
      }

      return true
    })
  }

  const getMerged = (categoryId: string) => {
    const reais = realProviders.filter(p => p.category === categoryId)
    const mocksEnabled = mockSettings[categoryId] !== false
    if (!mocksEnabled) return applyFilters(reais)
    const mocks = mocksByCategory[categoryId] || []
    const mocksNeeded = reais.length < 5 ? mocks.slice(0, 5 - reais.length) : []
    const merged = [...reais, ...mocksNeeded]
    return applyFilters(merged)
  }

  const getActiveMocks = () => {
    return mockProviders.filter(p => {
      if (!p.isMock) return true
      return mockSettings[p.category] !== false
    })
  }

  const allProviders = applyFilters([
    ...realProviders,
    ...getActiveMocks().filter(p => p.isMock),
  ])

  const onlineProviders = allProviders.filter(p => p.isOnline).slice(0, 10)

  const featuredProviders = allProviders
    .filter(p => p.isFeatured)
    .sort((a, b) => {
      if (a.id === OWNER_UID) return -1
      if (b.id === OWNER_UID) return 1
      return b.rating - a.rating
    })

  const allForHero = [
    ...realProviders,
    ...getActiveMocks().filter(p => p.isMock)
  ]

  const categoriesToShow = filters.categories.length > 0
    ? categories.filter(c => filters.categories.includes(c.id))
    : categories

  return (
    <main>
      <HeroBillboard providers={allForHero} />

      <div className="relative z-10 -mt-8">
        <FilterBar
          onFilterChange={setFilters}
          categories={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
          initialFilters={filters}
        />

        {(filters.categories.length > 0 || filters.onlyVerified || filters.minRating > 0 || filters.priceRange.min > 0 || filters.priceRange.max < 1000) && (
          <div className="px-4 sm:px-8 mb-4">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-primary text-sm font-semibold">
                🎯 Filtros ativos: {allProviders.length} prestadores encontrados
              </span>
            </div>
          </div>
        )}

        {featuredProviders.length > 0 && (
          <CategoryRow title="⭐ Em Destaque" providers={featuredProviders} badge="top" />
        )}

        {onlineProviders.length > 0 && (
          <CategoryRow title="🟢 Disponíveis Agora" providers={onlineProviders} badge="ao vivo" />
        )}

        <CategoryGrid categories={categoriesToShow.map(c => ({ id: c.id, name: c.name, icon: c.icon }))} />

        {categoriesToShow.map(cat => {
          const providers = getMerged(cat.id)
          if (providers.length === 0) return null
          return (
            <CategoryRow
              key={cat.id}
              title={`${cat.icon} ${cat.name}`}
              providers={providers}
            />
          )
        })}

        {allProviders.length === 0 && (
          <div className="px-4 sm:px-8 py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Nenhum prestador encontrado</h3>
              <p className="text-muted text-sm mb-6">
                {cityFilter && !showAllCities
                  ? `Não encontramos prestadores em ${cityFilter}.`
                  : 'Não encontramos prestadores que atendam aos filtros selecionados.'
                }
              </p>
              <button
                onClick={() => setFilters({
                  categories: [],
                  priceRange: { min: 0, max: 1000 },
                  searchRadius: 50,
                  onlyVerified: false,
                  minRating: 0,
                })}
                className="px-6 py-3 bg-surface border border-border text-muted font-bold rounded-xl hover:text-white transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {categories.length === 0 && (
          <>
            <CategoryRow title="🎵 Música" providers={getMerged('musica')} />
            <CategoryRow title="🧹 Limpeza e Organização" providers={getMerged('limpeza')} />
            <CategoryRow title="🏠 Reformas e Reparos" providers={getMerged('reformas')} />
            <CategoryRow title="📚 Educação" providers={getMerged('educacao')} />
            <CategoryRow title="💊 Saúde e Bem-Estar" providers={getMerged('saude')} />
            <CategoryRow title="🌿 Casa e Lar" providers={getMerged('casa')} />
          </>
        )}
      </div>
    </main>
  )
}
