import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X, Check, MapPin, DollarSign, Star, Shield } from 'lucide-react'

interface FilterBarProps {
  onFilterChange: (filters: Filters) => void
  categories: { id: string; name: string; icon: string }[]
  initialFilters?: Filters
}

export interface Filters {
  categories: string[]
  priceRange: { min: number; max: number }
  searchRadius: number
  onlyVerified: boolean
  minRating: number
}

export const FilterBar = ({ onFilterChange, categories, initialFilters }: FilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initialFilters || {
    categories: [],
    priceRange: { min: 0, max: 1000 },
    searchRadius: 50,
    onlyVerified: false,
    minRating: 0,
  })

  const toggleCategory = (catId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(c => c !== catId)
        : [...prev.categories, catId]
    }))
  }

  const applyFilters = () => {
    onFilterChange(filters)
    setShowFilters(false)
  }

  const clearFilters = () => {
    const defaultFilters: Filters = {
      categories: [],
      priceRange: { min: 0, max: 1000 },
      searchRadius: 50,
      onlyVerified: false,
      minRating: 0,
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const activeFiltersCount = [
    filters.categories.length > 0,
    filters.priceRange.min > 0 || filters.priceRange.max < 1000,
    filters.searchRadius < 50,
    filters.onlyVerified,
    filters.minRating > 0,
  ].filter(Boolean).length

  return (
    <>
      {/* Botão de filtros */}
      <div className="px-4 sm:px-8 py-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-white font-semibold hover:border-primary/50 transition-colors relative"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-sm">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-background text-xs font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Painel de filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Filtros</h2>
                    <p className="text-xs text-muted">Personalize sua busca</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Categorias */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <span className="flex items-center gap-2">
                      Categorias
                      {filters.categories.length > 0 && (
                        <span className="text-xs text-primary">({filters.categories.length} selecionadas)</span>
                      )}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const isSelected = filters.categories.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary scale-105'
                              : 'bg-background border-border text-muted hover:border-primary/50'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="text-xs font-semibold">{cat.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Faixa de preço */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Faixa de preço
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1.5">Mínimo</label>
                      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                        <span className="text-muted text-sm">R$</span>
                        <input
                          type="number"
                          value={filters.priceRange.min}
                          onChange={e => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: +e.target.value } }))}
                          className="flex-1 bg-transparent text-white text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1.5">Máximo</label>
                      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                        <span className="text-muted text-sm">R$</span>
                        <input
                          type="number"
                          value={filters.priceRange.max}
                          onChange={e => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: +e.target.value } }))}
                          className="flex-1 bg-transparent text-white text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raio de busca */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Raio de busca: {filters.searchRadius}km
                    </span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={filters.searchRadius}
                    onChange={e => setFilters(prev => ({ ...prev, searchRadius: +e.target.value }))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>5km</span>
                    <span>100km</span>
                  </div>
                </div>

                {/* Avaliação mínima */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Avaliação mínima: {filters.minRating.toFixed(1)} ⭐
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filters.minRating}
                    onChange={e => setFilters(prev => ({ ...prev, minRating: +e.target.value }))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>Qualquer</span>
                    <span>5.0</span>
                  </div>
                </div>

                {/* Apenas verificados */}
                <label className="flex items-center justify-between gap-4 p-4 bg-background rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${filters.onlyVerified ? 'text-green-400' : 'text-muted'}`} />
                    <div>
                      <p className="text-sm font-semibold text-white">Apenas verificados</p>
                      <p className="text-xs text-muted mt-0.5">Mostrar somente prestadores com selo</p>
                    </div>
                  </div>
                  <div
                    onClick={() => setFilters(prev => ({ ...prev, onlyVerified: !prev.onlyVerified }))}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                      filters.onlyVerified ? 'bg-green-500' : 'bg-border'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      filters.onlyVerified ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              </div>

              {/* Footer com botões */}
              <div className="sticky bottom-0 bg-surface border-t border-border p-4 flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
