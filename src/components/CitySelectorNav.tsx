import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGeolocation } from '@/hooks/useGeolocation'

// Lista das principais cidades brasileiras
const CITIES = [
  // Minas Gerais
  { name: 'Diamantina', state: 'MG' },
  { name: 'Belo Horizonte', state: 'MG' },
  { name: 'Uberlândia', state: 'MG' },
  { name: 'Contagem', state: 'MG' },
  { name: 'Juiz de Fora', state: 'MG' },
  
  // São Paulo
  { name: 'São Paulo', state: 'SP' },
  { name: 'Guarulhos', state: 'SP' },
  { name: 'Campinas', state: 'SP' },
  { name: 'São Bernardo do Campo', state: 'SP' },
  
  // Rio de Janeiro
  { name: 'Rio de Janeiro', state: 'RJ' },
  { name: 'São Gonçalo', state: 'RJ' },
  { name: 'Niterói', state: 'RJ' },
  
  // Outras capitais
  { name: 'Brasília', state: 'DF' },
  { name: 'Salvador', state: 'BA' },
  { name: 'Fortaleza', state: 'CE' },
  { name: 'Manaus', state: 'AM' },
  { name: 'Curitiba', state: 'PR' },
  { name: 'Recife', state: 'PE' },
  { name: 'Porto Alegre', state: 'RS' },
  { name: 'Goiânia', state: 'GO' },
  { name: 'Belém', state: 'PA' },
  { name: 'Florianpolis', state: 'SC' },
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

  // Atualiza cidade ao detectar geolocalizacão
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

  const handleShowAll = () => {
    updateCityFilter('', true)
    setIsOpen(false)
  }

  const displayText = showAllCities
    ? 'Todas as Cidades'
    : geoLocation.loading
    ? 'Detectando...'
    : cityFilter || 'Diamantina'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-surface/50 border border-primary/30 rounded-lg hover:bg-surface hover:border-primary transition-all group"
      >
        <MapPin className="w-5 h-5 text-primary shrink-0" />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] text-muted uppercase font-semibold tracking-wide">Serviços em</span>
          <span className="text-base font-black text-white truncate max-w-[140px] -mt-0.5">
            {displayText}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ml-1 group-hover:text-primary ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 max-h-96 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-bold text-muted uppercase">Selecione sua cidade</p>
              {geoLocation.detected && (
                <p className="text-xs text-blue-400 mt-1">
                  📍 Detectamos: {geoLocation.city}
                </p>
              )}
            </div>

            {/* Opção: Todas as Cidades */}
            <div className="p-2 border-b border-border">
              <button
                onClick={handleShowAll}
                className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                  showAllCities
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-background text-white'
                }`}
              >
                <div>
                  <p className="font-semibold text-sm">🌎 Todas as Cidades</p>
                  <p className="text-xs text-muted">Ver prestadores de todo Brasil</p>
                </div>
                {showAllCities && <Check className="w-4 h-4 text-primary" />}
              </button>
            </div>

            {/* Lista de Cidades */}
            <div className="max-h-64 overflow-y-auto">
              {CITIES.map((city, idx) => {
                const isSelected = !showAllCities && cityFilter === city.name
                return (
                  <button
                    key={`${city.name}-${idx}`}
                    onClick={() => handleSelectCity(city.name)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-background text-white'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">{city.name}</p>
                      <p className="text-xs text-muted">{city.state}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
