import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGeolocation } from '@/hooks/useGeolocation'

// Lista das principais cidades brasileiras
const CITIES = [
  // Minas Gerais
  { name: 'Diamantina', state: 'MG' },
  { name: 'Belo Horizonte', state: 'MG' },
  { name: 'Contagem', state: 'MG' },
  { name: 'Uberlândia', state: 'MG' },
  { name: 'Juiz de Fora', state: 'MG' },
  { name: 'Montes Claros', state: 'MG' },
  { name: 'Itaúna', state: 'MG' },
  { name: 'Sete Lagoas', state: 'MG' },
  { name: 'Poços de Caldas', state: 'MG' },
  { name: 'Varginha', state: 'MG' },
].sort((a, b) => a.name.localeCompare(b.name))

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

  // Atualiza cidade ao detectar geolocalização
  useEffect(() => {
    if (geoLocation.detected && geoLocation.city && !showAllCities) {
      // Verifica se a cidade detectada está na lista
      const cityExists = CITIES.some(
        c => c.name.toLowerCase() === geoLocation.city.toLowerCase()
      )
      if (cityExists) {
        updateCityFilter(geoLocation.city)
      }
    }
  }, [geoLocation.detected, geoLocation.city])

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
    : geoLocation.loading
    ? 'Detectando...'
    : cityFilter || 'Diamantina'

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
        disabled={geoLocation.loading}
      >
        <MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
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
              {CITIES.map((city, idx) => {
                const isSelected = !showAllCities && cityFilter === city.name
                return (
                  <button
                    key={`${city.name}-${idx}`}
                    onClick={() => handleSelectCity(city.name)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted hover:text-white hover:bg-background'
                    }`}
                  >
                    <span>{city.name}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-background/50">
              <p className="text-[10px] text-muted text-center">
                Serviços filtrados para {displayText}
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
