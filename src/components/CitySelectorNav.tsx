import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCities } from '@/hooks/useCities'

// Estado global do filtro de cidade (compartilhado entre componentes)
let globalCityFilter = 'Diamantina' // Padrão
let globalShowAll = false
const listeners = new Set<(city: string, showAll: boolean) => void>()

export const useCityFilter = () => {
  const [cityFilter, setCityFilter] = useState(globalCityFilter)
  const [showAllCities, setShowAllCities] = useState(globalShowAll)

  useEffect(() => {
    const listener = (city: string, showAll: boolean) => {
      setCityFilter(city)
      setShowAllCities(showAll)
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const updateCityFilter = (city: string, showAll: boolean = false) => {
    globalCityFilter = city
    globalShowAll = showAll
    listeners.forEach(l => l(city, showAll))
  }

  return { cityFilter, showAllCities, updateCityFilter }
}

export const CitySelectorNav = () => {
  const geoLocation = useGeolocation()
  const { cityFilter, showAllCities, updateCityFilter } = useCityFilter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Carrega cidades ativas do Firestore
  const { cities, loading: loadingCities, error: citiesError } = useCities()

  // Define cidade padrão quando as cidades carregarem
  useEffect(() => {
    if (cities.length > 0 && !cityFilter) {
      // Define primeira cidade como padrão (Diamantina, ordem 1)
      const defaultCity = cities[0]
      updateCityFilter(defaultCity.nome)
    }
  }, [cities])

  // Atualiza cidade ao detectar geolocalização
  useEffect(() => {
    if (geoLocation.detected && geoLocation.city && !showAllCities && cities.length > 0) {
      // Verifica se a cidade detectada está na lista de cidades ativas
      const cityExists = cities.some(
        c => c.nome.toLowerCase() === geoLocation.city.toLowerCase()
      )
      if (cityExists) {
        updateCityFilter(geoLocation.city)
      }
    }
  }, [geoLocation.detected, geoLocation.city, cities])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectCity = (cityName: string) => {
    updateCityFilter(cityName, false)
    setIsOpen(false)
  }

  const displayText = showAllCities
    ? 'Todas'
    : loadingCities
    ? 'Carregando...'
    : geoLocation.loading
    ? 'Detectando...'
    : cityFilter || (cities.length > 0 ? cities[0].nome : 'Diamantina')

  // Detecta se a seleção foi manual ou automática
  const isManualSelection = !showAllCities && cityFilter && !geoLocation.loading
  const selectionType = geoLocation.detected && geoLocation.city === cityFilter
    ? 'Detectado automaticamente'
    : isManualSelection
    ? 'Selecionado manualmente'
    : ''

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors group disabled:opacity-50"
        disabled={geoLocation.loading || loadingCities}
      >
        {(geoLocation.loading || loadingCities) ? (
          <Loader2 className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none">
          {displayText}
        </span>
        <ChevronDown 
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-white">Selecione sua cidade</p>
                </div>
              </div>
              
              {/* Indicador de tipo de seleção */}
              {selectionType && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    geoLocation.detected && geoLocation.city === cityFilter
                      ? 'bg-green-400'
                      : 'bg-blue-400'
                  }`} />
                  {selectionType}
                </div>
              )}
            </div>

            {/* Lista de Cidades */}
            <div className="py-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {loadingCities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : citiesError ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-red-400 mb-1">Erro ao carregar cidades</p>
                  <p className="text-[10px] text-muted">{citiesError}</p>
                </div>
              ) : cities.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted">Nenhuma cidade disponível</p>
                  <p className="text-[10px] text-muted mt-1">Contate o administrador</p>
                </div>
              ) : (
                cities.map((city) => {
                  const isSelected = !showAllCities && cityFilter === city.nome
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city.nome)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted hover:text-white hover:bg-background'
                      }`}
                    >
                      <span>{city.nome}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-background/50">
              <p className="text-[10px] text-muted text-center">
                {cities.length > 0 
                  ? `Serviços filtrados para ${displayText}`
                  : 'Aguarde o carregamento'
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(16, 185, 129, 0.3) transparent;
        }
      `}</style>
    </div>
  )
}
