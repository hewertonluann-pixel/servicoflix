import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
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

const docToProvider = (id: string, data: any): MockProvider => ({
  id,
  name: data.name || 'Sem nome',
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
  isFeatured: data.providerProfile?.featured || false,
  bio: data.providerProfile?.bio || '',
  skills: data.providerProfile?.skills || [],
  completedJobs: data.providerProfile?.completedJobs || 0,
  responseTime: data.providerProfile?.responseTime || '< 24h',
  whatsapp: data.providerProfile?.whatsapp || '',
  isMock: false,
})

export const HomePage = () => {
  const { user } = useSimpleAuth()
  const [realProviders, setRealProviders] = useState<MockProvider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ownerCard, setOwnerCard] = useState<MockProvider | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: { min: 0, max: 1000 },
    searchRadius: 50,
    onlyVerified: false,
    minRating: 0,
  })

  useEffect(() => {
    const load = async () => {
      try {
        // Carrega usuários
        const usersSnap = await getDocs(collection(db, 'users'))
        const providers: MockProvider[] = []
        let owner: MockProvider | null = null

        usersSnap.docs.forEach(d => {
          const data = d.data()
          
          // Se é o owner, guarda separadamente
          if (d.id === OWNER_UID && data.providerProfile) {
            owner = docToProvider(d.id, data)
            return
          }

          // Outros prestadores aprovados
          if (
            data.roles?.includes('provider') &&
            data.providerProfile?.status === 'approved'
          ) {
            providers.push(docToProvider(d.id, data))
          }
        })

        setRealProviders(providers)
        setOwnerCard(owner)

        // Carrega categorias do Firestore
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

  // Carrega preferências salvas do usuário
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

  // Aplica filtros aos prestadores
  const applyFilters = (providers: MockProvider[]): MockProvider[] => {
    return providers.filter(p => {
      // Filtro de categoria
      if (filters.categories.length > 0 && !filters.categories.includes(p.category)) {
        return false
      }

      // Filtro de preço
      if (p.priceFrom < filters.priceRange.min || p.priceFrom > filters.priceRange.max) {
        return false
      }

      // Filtro de verificação
      if (filters.onlyVerified && !p.isTopRated) {
        return false
      }

      // Filtro de avaliação
      if (p.rating < filters.minRating) {
        return false
      }

      return true
    })
  }

  // Para cada categoria do Firestore, pega prestadores reais; se <5, completa com mocks
  const getMerged = (categoryId: string) => {
    const reais = realProviders.filter(p => p.category === categoryId)
    const mocks = mocksByCategory[categoryId] || []
    const mocksNeeded = reais.length < 5 ? mocks.slice(0, 5 - reais.length) : []
    const merged = [...reais, ...mocksNeeded]
    return applyFilters(merged)
  }

  // Todos os prestadores (reais + mocks) com filtros aplicados
  const allProviders = applyFilters([
    ...realProviders,
    ...(ownerCard ? [ownerCard] : []),
    ...mockProviders.filter(p => p.isMock),
  ])

  // Seção online
  const onlineProviders = allProviders.filter(p => p.isOnline).slice(0, 10)

  // DESTAQUE - prestadores marcados como featured + owner sempre primeiro
  const featuredProviders = [
    ...(ownerCard ? [ownerCard] : []),
    ...realProviders.filter(p => p.isFeatured === true)
  ]
  const destaque = applyFilters(featuredProviders)

  const allForHero = [
    ...(ownerCard ? [ownerCard] : []),
    ...realProviders,
    ...mockProviders.filter(p => p.isMock)
  ]

  // Categorias para exibir (se filtro ativo, mostra apenas as selecionadas)
  const categoriesToShow = filters.categories.length > 0
    ? categories.filter(c => filters.categories.includes(c.id))
    : categories

  return (
    <main>
      <HeroBillboard providers={allForHero} />

      <div className="relative z-10 -mt-8">
        {/* Barra de filtros */}
        <FilterBar
          onFilterChange={setFilters}
          categories={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
          initialFilters={filters}
        />

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

        {destaque.length > 0 && (
          <CategoryRow title="⭐ Em Destaque" providers={destaque} badge="top" />
        )}

        {onlineProviders.length > 0 && (
          <CategoryRow title="🟢 Disponíveis Agora" providers={onlineProviders} badge="ao vivo" />
        )}

        {/* Grid de categorias */}
        <CategoryGrid categories={categoriesToShow.map(c => ({ id: c.id, name: c.name, icon: c.icon }))} />

        {/* Linhas de categorias dinâmicas */}
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

        {/* Mensagem se nenhum prestador atender aos filtros */}
        {allProviders.length === 0 && (
          <div className="px-4 sm:px-8 py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Nenhum prestador encontrado</h3>
              <p className="text-muted text-sm mb-6">
                Tente ajustar os filtros para encontrar mais opções
              </p>
              <button
                onClick={() => setFilters({
                  categories: [],
                  priceRange: { min: 0, max: 1000 },
                  searchRadius: 50,
                  onlyVerified: false,
                  minRating: 0,
                })}
                className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Se não houver categorias no Firestore, mostra fallback */}
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
