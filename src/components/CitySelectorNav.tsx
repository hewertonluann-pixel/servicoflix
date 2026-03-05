import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Check, X } from 'lucide-react'
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
  { name: 'Montes Claros', state: 'MG' },
  
  // São Paulo
  { name: 'São Paulo', state: 'SP' },
  { name: 'Guarulhos', state: 'SP' },
  { name: 'Campinas', state: 'SP' },
  { name: 'São Bernardo do Campo', state: 'SP' },
  { name: 'Ribeirão Preto', state: 'SP' },
  { name: 'Sorocaba', state: 'SP' },
  
  // Rio de Janeiro
  { name: 'Rio de Janeiro', state: 'RJ' },
  { name: 'São Gonçalo', state: 'RJ' },
  { name: 'Niterói', state: 'RJ' },
  { name: 'Duque de Caxias', state: 'RJ' },
  
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
  { name: 'São Luís', state: 'MA' },
  { name: 'Maceió', state: 'AL' },
  { name: 'Natal', state: 'RN' },
  { name: 'Vitória', state: 'ES' },
  { name: 'Itajaí', state: 'SC' },
  { name: 'Caxias do Sul', state: 'RS' },
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

  // Bloqueia scroll quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

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
    <>
      {/* Botão na navbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg hover:border-primary transition-colors"
      >
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-white truncate max-w-[120px]">
          {displayText}
        </span>
        <ChevronDown className="w-4 h-4 text-muted" />
      </button>

      {/* Modal Fullscreen */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-black text-white">Selecione sua cidade</h2>
                  </div>
                  {geoLocation.detected && (
                    <p className="text-xs text-muted">
                      🔍 Selecionado manualmente
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Lista de cidades */}
              <div className="max-h-[60vh] overflow-y-auto">
                {/* Opção: Todas as Cidades */}
                <div className="p-3 border-b border-border/50">
                  <button
                    onClick={handleShowAll}
                    className={`w-full px-4 py-3 rounded-xl text-left flex items-center justify-between transition-all ${
                      showAllCities
                        ? 'bg-primary/20 border-2 border-primary/50 text-primary'
                        : 'bg-background hover:bg-background/70 border-2 border-transparent text-white'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-base">🌎 Todas as Cidades</p>
                      <p className="text-xs text-muted mt-0.5">Ver prestadores de todo Brasil</p>
                    </div>
                    {showAllCities && <Check className="w-5 h-5 text-primary" />}
                  </button>
                </div>

                {/* Lista de cidades específicas */}
                <div className="p-3">
                  <p className="text-xs font-bold text-muted uppercase px-2 mb-2">Cidades disponíveis</p>
                  <div className="space-y-1">
                    {CITIES.map((city, idx) => {
                      const isSelected = !showAllCities && cityFilter === city.name
                      return (
                        <button
                          key={`${city.name}-${idx}`}
                          onClick={() => handleSelectCity(city.name)}
                          className={`w-full px-4 py-3 rounded-xl text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-primary/20 border-2 border-primary/50 text-primary'
                              : 'hover:bg-background/70 border-2 border-transparent text-white'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm">{city.name}</p>
                            <p className="text-xs text-muted">{city.state}</p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-background/50">
                <p className="text-xs text-muted text-center">
                  {!showAllCities && cityFilter ? (
                    <>
                      Serviços filtrados para <span className="text-primary font-bold">{cityFilter}</span>
                    </>
                  ) : (
                    'Mostrando todos os prestadores disponíveis'
                  )}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
