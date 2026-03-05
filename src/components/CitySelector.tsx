import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X, ChevronDown } from 'lucide-react'

// Lista de cidades brasileiras mais populares (ordenadas por população)
// Você pode expandir essa lista conforme necessário
const BRAZILIAN_CITIES = [
  // Minas Gerais
  { city: 'Diamantina', state: 'MG', region: 'Sudeste' },
  { city: 'Belo Horizonte', state: 'MG', region: 'Sudeste' },
  { city: 'Uberlândia', state: 'MG', region: 'Sudeste' },
  { city: 'Contagem', state: 'MG', region: 'Sudeste' },
  { city: 'Juiz de Fora', state: 'MG', region: 'Sudeste' },
  { city: 'Betim', state: 'MG', region: 'Sudeste' },
  { city: 'Montes Claros', state: 'MG', region: 'Sudeste' },
  { city: 'Ribeirão das Neves', state: 'MG', region: 'Sudeste' },
  { city: 'Uberaba', state: 'MG', region: 'Sudeste' },
  { city: 'Governador Valadares', state: 'MG', region: 'Sudeste' },
  
  // São Paulo
  { city: 'São Paulo', state: 'SP', region: 'Sudeste' },
  { city: 'Guarulhos', state: 'SP', region: 'Sudeste' },
  { city: 'Campinas', state: 'SP', region: 'Sudeste' },
  { city: 'São Bernardo do Campo', state: 'SP', region: 'Sudeste' },
  { city: 'Santo André', state: 'SP', region: 'Sudeste' },
  { city: 'Osasco', state: 'SP', region: 'Sudeste' },
  { city: 'São José dos Campos', state: 'SP', region: 'Sudeste' },
  { city: 'Ribeirão Preto', state: 'SP', region: 'Sudeste' },
  { city: 'Sorocaba', state: 'SP', region: 'Sudeste' },
  
  // Rio de Janeiro
  { city: 'Rio de Janeiro', state: 'RJ', region: 'Sudeste' },
  { city: 'São Gonçalo', state: 'RJ', region: 'Sudeste' },
  { city: 'Duque de Caxias', state: 'RJ', region: 'Sudeste' },
  { city: 'Nova Iguaçu', state: 'RJ', region: 'Sudeste' },
  { city: 'Niterói', state: 'RJ', region: 'Sudeste' },
  
  // Outras capitais e cidades importantes
  { city: 'Brasília', state: 'DF', region: 'Centro-Oeste' },
  { city: 'Salvador', state: 'BA', region: 'Nordeste' },
  { city: 'Fortaleza', state: 'CE', region: 'Nordeste' },
  { city: 'Manaus', state: 'AM', region: 'Norte' },
  { city: 'Curitiba', state: 'PR', region: 'Sul' },
  { city: 'Recife', state: 'PE', region: 'Nordeste' },
  { city: 'Porto Alegre', state: 'RS', region: 'Sul' },
  { city: 'Goiânia', state: 'GO', region: 'Centro-Oeste' },
  { city: 'Belém', state: 'PA', region: 'Norte' },
  { city: 'Guarujá', state: 'SP', region: 'Sudeste' },
  { city: 'Florianópolis', state: 'SC', region: 'Sul' },
  { city: 'São Luís', state: 'MA', region: 'Nordeste' },
  { city: 'Maceió', state: 'AL', region: 'Nordeste' },
  { city: 'Natal', state: 'RN', region: 'Nordeste' },
  { city: 'Campo Grande', state: 'MS', region: 'Centro-Oeste' },
  { city: 'João Pessoa', state: 'PB', region: 'Nordeste' },
  { city: 'Teresina', state: 'PI', region: 'Nordeste' },
  { city: 'Aracaju', state: 'SE', region: 'Nordeste' },
  { city: 'Cuiabá', state: 'MT', region: 'Centro-Oeste' },
  { city: 'Porto Velho', state: 'RO', region: 'Norte' },
  { city: 'Rio Branco', state: 'AC', region: 'Norte' },
  { city: 'Vitória', state: 'ES', region: 'Sudeste' },
].sort((a, b) => a.city.localeCompare(b.city))

interface CitySelectorProps {
  value?: string
  onChange: (city: string) => void
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

export const CitySelector = ({
  value = '',
  onChange,
  placeholder = 'Digite para buscar sua cidade...',
  error,
  required = false,
  disabled = false,
}: CitySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCity, setSelectedCity] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Atualiza quando value externo muda
  useEffect(() => {
    setSelectedCity(value)
  }, [value])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Normaliza texto para busca (remove acentos)
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  // Filtra cidades baseado na busca
  const filteredCities = BRAZILIAN_CITIES.filter((c) => {
    if (!search) return true
    const normalized = normalize(search)
    return (
      normalize(c.city).includes(normalized) ||
      normalize(c.state).includes(normalized)
    )
  }).slice(0, 50) // Limita a 50 resultados

  const handleSelect = (city: string) => {
    setSelectedCity(city)
    onChange(city)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    setSelectedCity('')
    onChange('')
    setSearch('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* Input com cidade selecionada */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-5 h-5 text-muted" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={selectedCity || search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            if (!e.target.value) {
              setSelectedCity('')
              onChange('')
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-11 py-3 bg-surface border rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary transition-colors ${
            error ? 'border-red-500' : 'border-border'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {selectedCity && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto"
        >
          {filteredCities.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-muted text-sm">
                Nenhuma cidade encontrada.
              </p>
              <p className="text-muted text-xs mt-1">
                Tente buscar por nome ou sigla do estado.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCities.map((c, idx) => {
                const isSelected = selectedCity === c.city
                return (
                  <button
                    key={`${c.city}-${c.state}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(c.city)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-surface-light text-white'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.city}</p>
                      <p className="text-xs text-muted">
                        {c.state} • {c.region}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="shrink-0 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}

      {/* Dica */}
      {!error && !selectedCity && !isOpen && (
        <p className="mt-1.5 text-xs text-muted">
          💡 Selecione sua cidade da lista para garantir compatibilidade
        </p>
      )}
    </div>
  )
}
