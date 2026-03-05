import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { HeroBillboard } from '@/components/HeroBillboard'
import { CategoryRow } from '@/components/CategoryRow'
import { CategoryGrid } from '@/components/CategoryGrid'
import { FilterBar, Filters } from '@/components/FilterBar'
import { mockProviders, mocksByCategory, MockProvider } from '@/data/mock'
import { MapPin } from 'lucide-react'

const OWNER_UID = 'Glhzl4mWRkNjttVBLaLhoUWLWxf1'

interface Category {
  id: string
  name: string
  icon: string
  active: boolean
}

const docToProvider = (id: string, data: any): MockProvider => ({
  id,
  name: data.providerProfile?.professionalName || data.name || 'Sem nome',
  avatar: data.avatar || `https://i.pravatar.cc/150?u=${id}`,
  coverImage: data.providerProfile?.coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
  specialty: data.providerProfile?.specialty || 'Profissional',
  category: (data.providerProfile?.categories?.[0] || data.providerProfile?.category || 'outros').toLowerCase(),
  rating: data.providerProfile?.rating || 5.0,
  reviewCount: data.providerProfile?.reviewCount || 0,
  priceFrom: parseFloat(data.providerProfile?.priceFrom) || 50,
  city: data.providerProfile?.city || '',
  neighborhood: data.providerProfile?.neighborhood || data.providerProfile?.city || '',
  isOnline: true,
  isTopRated: data.providerProfile?.verified || false,
  isFeatured: data.providerProfile?.featured || id === OWNER_UID, // Owner sempre featured
  bio: data.providerProfile?.bio || '',
  skills: data.providerProfile?.skills || [],
  completedJobs: data.providerProfile?.completedJobs || 0,
  responseTime: data.providerProfile?.responseTime || '< 24h',
  whatsapp: data.providerProfile?.whatsapp || '',
  isMock: false,
})

export const HomePage = () => {
  const { user } = useSimpleAuth()
  const geoLocation = useGeolocation()
  const [realProviders, setRealProviders] = useState<MockProvider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)
  const [cityFilter, setCityFilter] = useState<string>('')
  const [showAllCities, setShowAllCities] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: { min: 0, max: 1000 },
    searchRadius: 50,
    onlyVerified: false,
    minRating: 0,
  })

  // Define cidade do filtro (geolocalização ou usuário logado)
  useEffect(() => {
    if (showAllCities) {
      setCityFilter('')
      return
    }

    // Prioridade: cidade do usuário logado > geolocalização
    if (user?.providerProfile?.city) {
      setCityFilter(user.providerProfile.city)
    } else if (user?.city) {
      setCityFilter(user.city)
    } else if (geoLocation.detected && geoLocation.city) {
      setCityFilter(geoLocation.city)
    }
  }, [user, geoLocation.detected, geoLocation.city, showAllCities])

  useEffect(() => {
    const load = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'))
        const providers: MockProvider[] = []

        usersSnap.docs.forEach(d => {
          const data = d.data()
          
          if (!data.providerProfile) return

          // Owner sempre aparece (mesmo pendente)
          const isOwner = d.id === OWNER_UID
          
          // Outros precisam estar aprovados
          const isApproved = 
            data.roles?.includes('provider') && 
            data.providerProfile?.status === 'approved'

          if (isOwner || isApproved) {
            const provider = docToProvider(d.id, data)
            providers.push(provider)
            console.log(
              isOwner ? '👑 Owner:' : '✅ Prestador:',
              provider.name,
              '- Cidade:', provider.city,
              '- Featured:', provider.isFeatured
            )
          }
        })

        console.log(`📊 Total de prestadores: ${providers.length}`)
        console.log(`⭐ Featured: ${providers.filter(p => p.isFeatured).length}`)
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
      // Filtro de CIDADE (se não estiver em "ver todas as cidades")
      if (!showAllCities && cityFilter && p.city) {
        // Normalização: remove acentos e compara
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
    const mocks = mocksByCategory[categoryId] || []
    const mocksNeeded = reais.length < 5 ? mocks.slice(0, 5 - reais.length) : []
    const merged = [...reais, ...mocksNeeded]
    return applyFilters(merged)
  }

  // TODOS os prestadores (reais + mocks) com filtros aplicados
  const allProviders = applyFilters([
    ...realProviders,
    ...mockProviders.filter(p => p.isMock),
  ])

  // Seção online
  const onlineProviders = allProviders.filter(p => p.isOnline).slice(0, 10)

  // DESTAQUE - prestadores com isFeatured = true (inclui owner)
  // Ordena: owner sempre primeiro, depois por rating
  const featuredProviders = allProviders
    .filter(p => p.isFeatured)
    .sort((a, b) => {
      // Owner sempre primeiro
      if (a.id === OWNER_UID) return -1
      if (b.id === OWNER_UID) return 1
      // Depois ordena por rating
      return b.rating - a.rating
    })

  console.log('⭐ Prestadores em destaque (após filtros):', featuredProviders.length)
  console.log('Cidades:', featuredProviders.map(p => `${p.name} (${p.city})`))

  const allForHero = [
    ...realProviders,
    ...mockProviders.filter(p => p.isMock)
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

        {/* Indicador de cidade detectada */}
        {cityFilter && !showAllCities && (
          <div className="px-4 sm:px-8 mb-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-blue-400 text-sm font-semibold truncate">
                  {geoLocation.loading ? (
                    'Detectando sua localização...'
                  ) : (
                    `Exibindo prestadores de: ${cityFilter}`
                  )}
                </span>
              </div>
              <button
                onClick={() => setShowAllCities(true)}
                className="shrink-0 text-xs text-blue-300 hover:text-blue-200 underline"
              >
                Ver todas as cidades
              </button>
            </div>
          </div>
        )}

        {/* Botão para voltar ao filtro de cidade */}
        {showAllCities && (
          <div className="px-4 sm:px-8 mb-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-yellow-400 text-sm font-semibold">
                🌎 Exibindo prestadores de todas as cidades
              </span>
              <button
                onClick={() => setShowAllCities(false)}
                className="shrink-0 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                Filtrar por minha cidade
              </button>
            </div>
          </div>
        )}

        {/* Indicador de filtros ativos */}
        {(filters.categories.length > 0 || filters.onlyVerified || filters.minRating > 0 || filters.priceRange.min > 0 || filters.priceRange.max < 1000) && (
          <div className="px-4 sm:px-8 mb-4">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-primary text-sm font-semibold">
                🎯 Filtros ativos: {allProviders.length} prestadores encontrados
              </span>
            </div>
          </div>
        )}

        {/* SEÇÃO EM DESTAQUE - Aparece para TODOS se tiver featured da cidade */}
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
                {cityFilter 
                  ? `Não encontramos prestadores em ${cityFilter}. Experimente ver prestadores de outras cidades.`
                  : 'Não encontramos prestadores que atendam aos filtros selecionados.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {cityFilter && (
                  <button
                    onClick={() => setShowAllCities(true)}
                    className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    Ver Todas as Cidades
                  </button>
                )}
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
