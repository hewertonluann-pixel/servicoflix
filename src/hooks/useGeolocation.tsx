import { useState, useEffect } from 'react'

interface GeolocationData {
  city: string
  state: string
  country: string
  latitude: number
  longitude: number
  loading: boolean
  error: string | null
  detected: boolean
}

interface LocationIQResponse {
  address: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

/**
 * Hook para detectar localização do usuário automaticamente
 * 
 * Estratégias (em ordem de tentativa):
 * 1. Navigator Geolocation API (navegador) - mais preciso
 * 2. IP Geolocation API (fallback) - menos preciso mas funciona sempre
 * 3. localStorage (cache) - para não pedir permissão toda vez
 */
export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationData>({
    city: '',
    state: '',
    country: '',
    latitude: 0,
    longitude: 0,
    loading: true,
    error: null,
    detected: false,
  })

  useEffect(() => {
    detectLocation()
  }, [])

  const detectLocation = async () => {
    // 1. Verifica se tem cache no localStorage
    const cached = localStorage.getItem('userLocation')
    if (cached) {
      try {
        const cachedData = JSON.parse(cached)
        const cacheAge = Date.now() - cachedData.timestamp
        const ONE_DAY = 24 * 60 * 60 * 1000

        // Cache válido por 24h
        if (cacheAge < ONE_DAY) {
          console.log('📍 Localização carregada do cache:', cachedData.city)
          setLocation({
            ...cachedData,
            loading: false,
            detected: true,
          })
          return
        }
      } catch (err) {
        console.warn('Erro ao ler cache de localização:', err)
      }
    }

    // 2. Tenta usar Navigator Geolocation (navegador)
    if ('geolocation' in navigator) {
      console.log('📍 Solicitando permissão de localização...')
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('✅ Localização obtida:', position.coords)
          await reverseGeocode(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.warn('⚠️ Permissão negada ou erro:', error.message)
          // Fallback para IP geolocation
          detectByIP()
        },
        {
          timeout: 10000,
          maximumAge: 300000, // Cache de 5 minutos
          enableHighAccuracy: false, // Mais rápido, menos preciso
        }
      )
    } else {
      console.warn('⚠️ Geolocation não suportado pelo navegador')
      detectByIP()
    }
  }

  // Converte coordenadas em cidade usando LocationIQ (gratuito)
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      // LocationIQ API (gratuita até 10k requests/dia)
      // Pode substituir por outra API se preferir
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR`,
        {
          headers: {
            'User-Agent': 'ServicoFlix/1.0'
          }
        }
      )

      if (!response.ok) throw new Error('Erro na API de geolocalização')

      const data: LocationIQResponse = await response.json()
      const city = data.address.city || data.address.town || data.address.village || ''
      const state = data.address.state || ''
      const country = data.address.country || ''

      console.log('🏛️ Cidade detectada:', city, state)

      const locationData = {
        city,
        state,
        country,
        latitude: lat,
        longitude: lon,
        loading: false,
        error: null,
        detected: true,
        timestamp: Date.now(),
      }

      setLocation(locationData)
      
      // Salva no cache
      localStorage.setItem('userLocation', JSON.stringify(locationData))
    } catch (err) {
      console.error('Erro ao converter coordenadas:', err)
      detectByIP()
    }
  }

  // Fallback: detecta cidade pelo IP usando ipapi.co (gratuito)
  const detectByIP = async () => {
    try {
      console.log('🌐 Detectando localização por IP...')
      
      const response = await fetch('https://ipapi.co/json/')
      if (!response.ok) throw new Error('Erro na API de IP')

      const data = await response.json()
      console.log('🏛️ Cidade detectada por IP:', data.city)

      const locationData = {
        city: data.city || '',
        state: data.region || '',
        country: data.country_name || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        loading: false,
        error: null,
        detected: true,
        timestamp: Date.now(),
      }

      setLocation(locationData)
      
      // Salva no cache
      localStorage.setItem('userLocation', JSON.stringify(locationData))
    } catch (err) {
      console.error('Erro ao detectar por IP:', err)
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Não foi possível detectar sua localização',
        detected: false,
      }))
    }
  }

  // Função para permitir usuário trocar cidade manualmente
  const setCity = (city: string) => {
    const newLocation = {
      ...location,
      city,
      detected: true,
    }
    setLocation(newLocation)
    localStorage.setItem('userLocation', JSON.stringify(newLocation))
  }

  // Limpa cache e detecta novamente
  const refresh = () => {
    localStorage.removeItem('userLocation')
    setLocation(prev => ({ ...prev, loading: true }))
    detectLocation()
  }

  return {
    ...location,
    setCity,
    refresh,
  }
}
