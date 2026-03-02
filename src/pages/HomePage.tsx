import { HeroBillboard } from '@/components/HeroBillboard'
import { CategoryRow } from '@/components/CategoryRow'
import { CategoryGrid } from '@/components/CategoryGrid'
import { mockProviders, mockCategories } from '@/data/mock'

export const HomePage = () => {
  const online = mockProviders.filter(p => p.isOnline)
  const topRated = mockProviders.filter(p => p.isTopRated)
  const cleaning = mockProviders.filter(p => p.category === 'limpeza')
  const repairs = mockProviders.filter(p => ['encanamento', 'eletrica'].includes(p.category))

  return (
    <main>
      {/* Hero estilo Netflix */}
      <HeroBillboard providers={mockProviders} />

      {/* Conteúdo principal */}
      <div className="relative z-10 -mt-8">
        <CategoryRow
          title="🟢 Disponíveis Agora"
          providers={online}
          badge="ao vivo"
        />
        <CategoryRow
          title="⭐ Mais Bem Avaliados"
          providers={topRated}
          badge="top"
        />
        <CategoryGrid categories={mockCategories} />
        <CategoryRow
          title="🧹 Limpeza e Organização"
          providers={cleaning}
        />
        <CategoryRow
          title="🔧 Reparos e Manutenção"
          providers={repairs}
        />
        <CategoryRow
          title="🔥 Em Alta na sua Região"
          providers={mockProviders.slice().reverse()}
        />
      </div>
    </main>
  )
}
