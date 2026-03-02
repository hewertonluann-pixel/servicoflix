import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { mockProviders, mockCategories } from '@/data/mock'
import { ProviderCard } from '@/components/ProviderCard'

export const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || '')

  const filtered = mockProviders.filter(p => {
    const matchQuery = query === '' || p.name.toLowerCase().includes(query.toLowerCase()) || p.specialty.toLowerCase().includes(query.toLowerCase())
    const matchCat = selectedCategory === '' || p.category === selectedCategory
    return matchQuery && matchCat
  })

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-black mb-6">Explorar Profissionais</h1>

        {/* Barra de busca */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por serviço ou profissional..."
              className="bg-transparent text-white text-sm placeholder:text-muted outline-none w-full"
            />
          </div>
          <button className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 text-muted hover:text-white transition-colors text-sm">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
        </div>

        {/* Filtros por categoria */}
        <div className="flex gap-2 overflow-x-auto scroll-smooth-x pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedCategory === '' ? 'bg-primary text-background' : 'bg-surface text-muted hover:text-white border border-border'
            }`}
          >
            Todos
          </button>
          {mockCategories.map(cat => (
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

      {/* Resultados */}
      <p className="text-muted text-sm mb-4">{filtered.length} profissionais encontrados</p>
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
    </div>
  )
}
