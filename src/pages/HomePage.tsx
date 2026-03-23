// src/pages/HomePage.tsx - VERSÃO SEM MOCK (completa)
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Star, MapPin, Phone, Clock, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Hero } from '@/components/Hero'
import { CategoryGrid } from '@/components/CategoryGrid'
import { FilterBar, Filters } from '@/components/FilterBar'
import { ProviderGrid } from '@/components/ProviderGrid'
import { useProviders } from '@/hooks/useProviders'
import { useCategories } from '@/hooks/useCategories'

const OWNER_UID = 'Glhzl4mWRkNjttVBLaLhoUWLWxf1'

export const HomePage = () => {
  const [activeFilters, setActiveFilters] = useState<Filters>({
    category: '',
    city: '',
    online: false,
    rating: '',
    price: ''
  })

  // ✅ DADOS REAIS FIRESTORE
  const { providers, loading } = useProviders()
  const { categories, loading: categoriesLoading } = useCategories()

  const filteredProviders = providers.filter(provider => {
    if (activeFilters.category && provider.specialty !== activeFilters.category) return false
    if (activeFilters.city && provider.city !== activeFilters.city) return false
    if (activeFilters.online && !provider.isOnline) return false
    if (activeFilters.rating === '4.5+' && provider.rating < 4.5) return false
    return true
  })

  const topProviders = filteredProviders.slice(0, 8)
  const onlineProviders = filteredProviders.filter(p => p.isOnline).slice(0, 4)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <Hero />

      {/* Filtros */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Barra de busca */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-6 shadow-xl"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="Busque por especialidade, nome ou cidade..."
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-lg focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <FilterBar filters={activeFilters} onFiltersChange={setActiveFilters} />
          </div>
        </motion.div>

        {/* Categorias */}
        {!categoriesLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <Users className="w-8 h-8" />
              Escolha sua especialidade
            </h2>
            <CategoryGrid categories={categories} />
          </motion.div>
        )}

        {/* Melhores Profissionais */}
        {topProviders.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-400 fill-current" />
                Melhores Profissionais
              </h2>
              <Link 
                to="/profissionais?sort=top"
                className="text-primary font-bold text-lg hover:text-primary-dark transition-colors"
              >
                Ver todos →
              </Link>
            </div>
            <ProviderGrid providers={topProviders} loading={loading} />
          </motion.section>
        )}

        {/* Online Agora */}
        {onlineProviders.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-400" />
                Online Agora
              </h2>
              <Link 
                to="/profissionais?online=true"
                className="text-green-400 font-bold text-lg hover:text-green-500 transition-colors"
              >
                Ver todos →
              </Link>
            </div>
            <ProviderGrid providers={onlineProviders} loading={loading} variant="compact" />
          </motion.section>
        )}

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 text-center py-16"
        >
          <div className="bg-surface/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-surface/75 transition-all duration-300">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2">{providers.length}+</h3>
            <p className="text-muted text-lg">Profissionais</p>
          </div>
          <div className="bg-surface/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-surface/75 transition-all duration-300">
            <div className="w-16 h-16 bg-green-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2">24/7</h3>
            <p className="text-muted text-lg">Atendimento</p>
          </div>
          <div className="bg-surface/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-surface/75 transition-all duration-300">
            <div className="w-16 h-16 bg-yellow-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-yellow-400 fill-current" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2">4.9⭐</h3>
            <p className="text-muted text-lg">Avaliação Média</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
