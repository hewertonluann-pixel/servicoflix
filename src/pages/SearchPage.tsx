import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { mockProviders, MockProvider } from '@/data/mock'
import { ProviderCard } from '@/components/ProviderCard'

const docToProvider = (id: string, data: any): MockProvider => ({
  id,
  name: data.name || 'Sem nome',
  avatar: data.avatar || `https://i.pravatar.cc/150?u=${id}`,
  coverImage: data.providerProfile?.coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
  specialty: data.providerProfile?.specialty || 'Profissional',
  category: (data.providerProfile?.categories?.[0] || data.providerProfile?.category || 'outros').toLowerCase(),
  rating: data.providerProfile?.ratinname: data.providerProfile?.professionalName || data.name || 'Sem nome',gname: data.providerProfile?.professionalName || data.name || 'Sem nome',isOnline: data.providerProfile?.isOnline === true, || 5.0,
  reviewCount: data.providerProfile?.reviewCount || 0,
  priceFrom: parseFloat(data.providerProfile?.priceFrom) || 50,
  city: data.providerProfile?.city || '',
  neighborhood: data.providerProfile?.neighborhood || data.providerProfile?.city || '',
  isOnline: true,
  isTopRated: data.providerProfile?.verified || false,
  isFeatured: false,
  bio: data.providerProfile?.bio || '',
  skills: data.providerProfile?.skills || [],
  completedJobs: data.providerProfile?.completedJobs || 0,
  responseTime: data.providerProfile?.responseTime || '< 24h',
  whatsapp: data.providerProfile?.whatsapp || '',
  isMock: false,
})

export const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || '')
  const [allProviders, setAllProviders] = useState<MockProvider[]>([])
  const [loading, setLoading] = useState(true) 
  const [categories, setCategories] = useState<{id: string; name: string; icon: string}[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const reais: MockProvider[] = []
        snap.docs.forEach(d => {
          const data = d.data()
          if (data.roles?.includes('provider') && data.providerProfile?.status === 'approved') {
            reais.push(docToProvider(d.id, data))
          }
        })
        // Mocks como preenchimento: exibe apenas mocks de categorias sem reais suficientes
        const categoriesWithReais = new Set(reais.map(p => p.category))
        const mocksFiltered = mockProviders.filter(p => {
          if (!p.isMock) return true // perfil real do dono sempre aparece
          // Exibe o mock se a categoria ainda tem menos de 5 reais
          const countReal = reais.filter(r => r.category === p.category).length
          return countReal < 5
        })
        // Reais primeiro, depois mocks complementares
        setAllProviders([...reais, ...mocksFiltered.filter(p => p.isMock)])         
          const catSnap = await getDocs(collection(db, 'categories'))         
          const cats = catSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter((c: any) => c.active).sort((a: any, b: any) => a.name.localeCompare(b.name))        
      setCategories(cats)
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
    const matchQuery = query === '' ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.specialty.toLowerCase().includes(query.toLowerCase()) ||
      p.skills?.some(s => s.toLowerCase().includes(query.toLowerCase()))
    const matchCat = selectedCategory === '' || p.category === selectedCategory
    return matchQuery && matchCat
  })

  const realCount = filtered.filter(p => !p.isMock).length
  const mockCount = filtered.filter(p => p.isMock).length

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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
              selectedCategory === '' ? 'bg-primary text-background' : 'bg-surface text-muted hover:text-white border border-border'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedCategory === cat.id ? 'bg-primary text-background' : 'bg-surface text-muted hover:text-white border border-border'
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
              {realCount > 0 && <span className="text-white font-semibold">{realCount} real{realCount > 1 ? 'is' : ''}</span>}
              {realCount > 0 && mockCount > 0 && <span className="text-muted"> + </span>}
              {mockCount > 0 && <span className="text-red-400 text-sm">{mockCount} exemplo{mockCount > 1 ? 's' : ''}</span>}
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
