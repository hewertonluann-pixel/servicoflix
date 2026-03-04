import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { HeroBillboard } from '@/components/HeroBillboard'
import { CategoryRow } from '@/components/CategoryRow'
import { CategoryGrid } from '@/components/CategoryGrid'
import { mockProviders, mockCategories, mocksByCategory, realOwnerProvider, MockProvider } from '@/data/mock'

// Converte um doc do Firestore em MockProvider
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
  isFeatured: false,
  bio: data.providerProfile?.bio || '',
  skills: data.providerProfile?.skills || [],
  completedJobs: data.providerProfile?.completedJobs || 0,
  responseTime: data.providerProfile?.responseTime || '< 24h',
  whatsapp: data.providerProfile?.whatsapp || '',
  isMock: false, // real!
})

export const HomePage = () => {
  const [realProviders, setRealProviders] = useState<MockProvider[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const providers: MockProvider[] = []
        snap.docs.forEach(d => {
          const data = d.data()
          if (
            data.roles?.includes('provider') &&
            data.providerProfile?.status === 'approved'
          ) {
            providers.push(docToProvider(d.id, data))
          }
        })
        setRealProviders(providers)
      } catch (err) {
        console.warn('Erro ao carregar prestadores reais:', err)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [])

  // Para cada categoria, usa reais primeiro; se houver menos de 5, completa com mocks
  const getMerged = (category: string) => {
    const reais = realProviders.filter(p => p.category === category)
    const mocks = mocksByCategory[category] || []
    // Remove mocks que a categoria já tem reais suficientes
    const mocksNeeded = mocks.slice(reais.length) // só preenche lacunas
    return [...reais, ...mocksNeeded]
  }

  // Seção "Online agora": reais online + mocks online (limitado a 10)
  const onlineProviders = [
    ...realProviders.filter(p => p.isOnline),
    ...mockProviders.filter(p => p.isMock && p.isOnline),
  ].slice(0, 10)

  // Destaque: dono do site + reais top rated
  const destaque = [
    realOwnerProvider,
    ...realProviders.filter(p => p.isTopRated),
  ]

  const allForHero = realProviders.length > 0 ? [...realProviders, ...mockProviders.filter(p => p.isMock)] : mockProviders

  return (
    <main>
      <HeroBillboard providers={allForHero} />

      <div className="relative z-10 -mt-8">
        {destaque.length > 0 && (
          <CategoryRow title="⭐ Em Destaque" providers={destaque} badge="top" />
        )}

        {onlineProviders.length > 0 && (
          <CategoryRow title="🟢 Disponíveis Agora" providers={onlineProviders} badge="ao vivo" />
        )}

        <CategoryGrid categories={mockCategories} />

        <CategoryRow title="🎵 Música" providers={getMerged('musica')} />
        <CategoryRow title="🧹 Limpeza e Organização" providers={getMerged('limpeza')} />
        <CategoryRow title="🏠 Reformas e Reparos" providers={getMerged('reformas')} />
        <CategoryRow title="📚 Educação" providers={getMerged('educacao')} />
        <CategoryRow title="💊 Saúde e Bem-Estar" providers={getMerged('saude')} />
        <CategoryRow title="🌿 Casa e Lar" providers={getMerged('casa')} />
      </div>
    </main>
  )
}
