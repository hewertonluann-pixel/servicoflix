import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, Check } from 'lucide-react'

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
  const [selectedCity, setSelectedCity] = useState<string>('Diamantina')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Carrega cidade do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedCity')
    if (saved && CITIES.includes(saved)) {
      setSelectedCity(saved)
    }
  }, [])

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

  const handleSelectCity = (city: string) => {
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
    setIsOpen(false)
    onChange?.(city)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors group"
      >
        <MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none">
          {selectedCity}
        </span>
        <ChevronDown
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

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
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-white">Selecione sua cidade</p>
              </div>
            </div>

            {/* Lista de cidades */}
            <div className="py-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => handleSelectCity(city)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    city === selectedCity
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted hover:text-white hover:bg-background'
                  }`}
                >
                  <span>{city}</span>
                  {city === selectedCity && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-background/50">
              <p className="text-[10px] text-muted text-center">
                Serviços filtrados para {selectedCity}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Hook para usar a cidade selecionada
export const useSelectedCity = () => {
  const [city, setCity] = useState<string>('Diamantina')

  useEffect(() => {
    const saved = localStorage.getItem('selectedCity')
    if (saved && CITIES.includes(saved)) {
      setCity(saved)
    }

    // Listener para mudanças
    const handleStorageChange = () => {
      const newCity = localStorage.getItem('selectedCity')
      if (newCity && CITIES.includes(newCity)) {
        setCity(newCity)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return city
}
