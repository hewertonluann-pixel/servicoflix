import { useState, useEffect } from 'react'

// Cidades suportadas em Minas Gerais
const SUPPORTED_CITIES = [
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

interface GeoLocation {
  city: string
  state: string
  country: string
  latitude?: number
  longitude?: number
  method: 'gps' | 'ip' | 'manual' | 'default'
}

interface UseGeoLocationReturn {
  city: string
  location: GeoLocation | null
  loading: boolean
  error: string | null
  detectLocation: () => Promise<void>
  setManualCity: (city: string) => void
}

// Normaliza nome de cidade para match
const normalizeCityName = (city: string): string => {
  const normalized = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()

  // Map de variações comuns
  const cityMap: Record<string, string> = {
    'bh': 'Belo Horizonte',
    'uberlandia': 'Uberlândia',
    'juiz de fora': 'Juiz de Fora',
    'jf': 'Juiz de Fora',
    'montes claros': 'Montes Claros',
    'itauna': 'Itaúna',
    'sete lagoas': 'Sete Lagoas',
    'pocos de caldas': 'Poços de Caldas',
  }

  if (cityMap[normalized]) {
    return cityMap[normalized]
  }

  // Busca por match parcial
  const match = SUPPORTED_CITIES.find(supported => {
    const normalizedSupported = supported
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    return normalizedSupported.includes(normalized) || normalized.includes(normalizedSupported)
  })

  return match || city
}

// Encontra cidade suportada mais próxima
const findClosestSupportedCity = (city: string): string => {
  const normalized = normalizeCityName(city)
  
  // Se já é uma cidade suportada, retorna
  if (SUPPORTED_CITIES.includes(normalized)) {
    return normalized
  }

  // Se não encontrou, retorna Diamantina como padrão
  return 'Diamantina'
}

// Detecta localização via GPS (Geolocation API)
const detectByGPS = async (): Promise<GeoLocation | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          // Reverse geocoding usando OpenStreetMap Nominatim (grátis)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`,
            {
              headers: {
                'User-Agent': 'ServicoFlix/1.0',
              },
            }
          )

          if (!response.ok) {
            resolve(null)
            return
          }

          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.municipality || ''
          const state = data.address?.state || ''
          const country = data.address?.country || 'Brasil'

          if (city) {
            const supportedCity = findClosestSupportedCity(city)
            resolve({
              city: supportedCity,
              state,
              country,
              latitude,
              longitude,
              method: 'gps',
            })
          } else {
            resolve(null)
          }
        } catch (error) {
          console.error('Erro ao fazer reverse geocoding:', error)
          resolve(null)
        }
      },
      (error) => {
        console.warn('Geolocalização negada ou erro:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache de 5 minutos
      }
    )
  })
}

// Detecta localização via IP (ipapi.co - grátis)
const detectByIP = async (): Promise<GeoLocation | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // Timeout de 5s
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const city = data.city || ''
    const state = data.region || ''
    const country = data.country_name || 'Brasil'

    if (city) {
      const supportedCity = findClosestSupportedCity(city)
      return {
        city: supportedCity,
        state,
        country,
        latitude: data.latitude,
        longitude: data.longitude,
        method: 'ip',
      }
    }

    return null
  } catch (error) {
    console.error('Erro ao detectar localização por IP:', error)
    return null
  }
}

export const useGeoLocation = (): UseGeoLocationReturn => {
  const [city, setCity] = useState<string>('Diamantina')
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detecta localização automaticamente
  const detectLocation = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Tenta GPS primeiro (mais preciso)
      const gpsLocation = await detectByGPS()
      if (gpsLocation) {
        setLocation(gpsLocation)
        setCity(gpsLocation.city)
        localStorage.setItem('selectedCity', gpsLocation.city)
        localStorage.setItem('geoLocation', JSON.stringify(gpsLocation))
        localStorage.setItem('geoLocationTimestamp', Date.now().toString())
        setLoading(false)
        return
      }

      // 2. Fallback para IP
      const ipLocation = await detectByIP()
      if (ipLocation) {
        setLocation(ipLocation)
        setCity(ipLocation.city)
        localStorage.setItem('selectedCity', ipLocation.city)
        localStorage.setItem('geoLocation', JSON.stringify(ipLocation))
        localStorage.setItem('geoLocationTimestamp', Date.now().toString())
        setLoading(false)
        return
      }

      // 3. Se falhar, usa cidade padrão
      const defaultLocation: GeoLocation = {
        city: 'Diamantina',
        state: 'Minas Gerais',
        country: 'Brasil',
        method: 'default',
      }
      setLocation(defaultLocation)
      setCity('Diamantina')
      setError('Não foi possível detectar sua localização. Usando cidade padrão.')
    } catch (err: any) {
      console.error('Erro na detecção de localização:', err)
      setError('Erro ao detectar localização')
      setCity('Diamantina')
    } finally {
      setLoading(false)
    }
  }

  // Define cidade manualmente
  const setManualCity = (newCity: string) => {
    if (SUPPORTED_CITIES.includes(newCity)) {
      setCity(newCity)
      localStorage.setItem('selectedCity', newCity)
      const manualLocation: GeoLocation = {
        city: newCity,
        state: 'Minas Gerais',
        country: 'Brasil',
        method: 'manual',
      }
      setLocation(manualLocation)
      localStorage.setItem('geoLocation', JSON.stringify(manualLocation))
    }
  }

  // Carrega ao montar
  useEffect(() => {
    const loadLocation = async () => {
      // Verifica se já tem cidade salva manualmente
      const savedCity = localStorage.getItem('selectedCity')
      const savedLocation = localStorage.getItem('geoLocation')
      const savedTimestamp = localStorage.getItem('geoLocationTimestamp')

      // Se tem cidade manual, usa ela
      if (savedLocation) {
        try {
          const parsed: GeoLocation = JSON.parse(savedLocation)
          if (parsed.method === 'manual') {
            setCity(parsed.city)
            setLocation(parsed)
            setLoading(false)
            return
          }
        } catch (e) {
          // Ignora erro de parse
        }
      }

      // Verifica se cache é válido (menos de 24 horas)
      const cacheValid =
        savedTimestamp && Date.now() - parseInt(savedTimestamp) < 24 * 60 * 60 * 1000

      if (cacheValid && savedCity && savedLocation) {
        try {
          const parsed: GeoLocation = JSON.parse(savedLocation)
          setCity(parsed.city)
          setLocation(parsed)
          setLoading(false)
          return
        } catch (e) {
          // Se falhar ao parsear, detecta novamente
        }
      }

      // Cache inválido ou não existe, detecta novamente
      await detectLocation()
    }

    loadLocation()
  }, [])

  return {
    city,
    location,
    loading,
    error,
    detectLocation,
    setManualCity,
  }
}
