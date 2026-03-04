import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, Check, Navigation, Loader2, AlertCircle } from 'lucide-react'
import { useGeoLocation } from '@/hooks/useGeoLocation'

const CITIES = [
  'Diamantina',
  'Belo Horizonte',
  'Contagem',
  'Uberlândia',
  'Juiz de Fora',
  'Montes Claros',
  'Itaúna',
  'Sete Lagoas',
  'Poços de Caldas',
  'Varginha',
]

interface CitySelectorProps {
  onChange?: (city: string) => void
}

export const CitySelector = ({ onChange }: CitySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showGeoPrompt, setShowGeoPrompt] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { city, location, loading, error, detectLocation, setManualCity } = useGeoLocation()

  // Mostra prompt de geolocalização na primeira vez
  useEffect(() => {
    const hasPrompted = localStorage.getItem('geoLocationPrompted')
    if (!hasPrompted && !loading && location?.method === 'default') {
      setShowGeoPrompt(true)
    }
  }, [loading, location])

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

  const handleSelectCity = (selectedCity: string) => {
    setManualCity(selectedCity)
    setIsOpen(false)
    onChange?.(selectedCity)
  }

  const handleDetectLocation = async () => {
    setShowGeoPrompt(false)
    localStorage.setItem('geoLocationPrompted', 'true')
    await detectLocation()
    onChange?.(city)
  }

  const handleDismissGeoPrompt = () => {
    setShowGeoPrompt(false)
    localStorage.setItem('geoLocationPrompted', 'true')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors group disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none">
          {city}
        </span>
        {location?.method === 'gps' && (
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" title="Localização automática" />
        )}
        <ChevronDown
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Prompt de geolocalização */}
      <AnimatePresence>
        {showGeoPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 bg-surface border border-primary/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">
                  Ativar localização?
                </h3>
                <p className="text-xs text-muted mb-3">
                  Encontre prestadores próximos a você automaticamente
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDetectLocation}
                    className="flex-1 px-3 py-2 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Permitir
                  </button>
                  <button
                    onClick={handleDismissGeoPrompt}
                    className="px-3 py-2 bg-surface border border-border text-muted text-xs font-semibold rounded-lg hover:text-white transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
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
                {location?.method !== 'manual' && (
                  <button
                    onClick={detectLocation}
                    disabled={loading}
                    className="p-1 text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                    title="Detectar localização"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {location && location.method !== 'default' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                  {location.method === 'gps' && (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Localização precisa (GPS)
                    </>
                  )}
                  {location.method === 'ip' && (
                    <>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      Localização aproximada (IP)
                    </>
                  )}
                  {location.method === 'manual' && (
                    <>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      Selecionado manualmente
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Lista de cidades */}
            <div className="py-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {CITIES.map(cityName => (
                <button
                  key={cityName}
                  onClick={() => handleSelectCity(cityName)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    cityName === city
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted hover:text-white hover:bg-background'
                  }`}
                >
                  <span>{cityName}</span>
                  {cityName === city && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-background/50">
              {error ? (
                <div className="flex items-center gap-2 text-[10px] text-yellow-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>{error}</span>
                </div>
              ) : (
                <p className="text-[10px] text-muted text-center">
                  Serviços filtrados para {city}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Hook para usar a cidade selecionada em outros componentes
export const useSelectedCity = () => {
  const { city } = useGeoLocation()
  return city
}
