import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface City {
  id: string
  nome: string
  uf: string
  slug: string
  status: 'ativa' | 'inativa' | 'arquivada'
  ordem: number
  created_at?: any
}

/**
 * Hook para carregar cidades ativas do Firestore
 * Retorna apenas cidades com status 'ativa' ordenadas por 'ordem'
 */
export const useCities = () => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCities = async () => {
      setLoading(true)
      setError(null)
      try {
        const q = query(
          collection(db, 'cities'),
          where('status', '==', 'ativa'),
          orderBy('ordem', 'asc')
        )
        const snapshot = await getDocs(q)
        const loadedCities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as City[]
        setCities(loadedCities)
      } catch (err: any) {
        console.error('Erro ao carregar cidades:', err)
        setError(err?.message || 'Erro ao carregar cidades')
      } finally {
        setLoading(false)
      }
    }

    loadCities()
  }, [])

  return { cities, loading, error }
}

/**
 * Hook para carregar TODAS as cidades (ativas, inativas, arquivadas)
 * Usado no AdminPanel para gerenciamento
 */
export const useAllCities = () => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const q = query(
        collection(db, 'cities'),
        orderBy('ordem', 'asc')
      )
      const snapshot = await getDocs(q)
      const loadedCities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as City[]
      setCities(loadedCities)
    } catch (err: any) {
      console.error('Erro ao carregar cidades:', err)
      setError(err?.message || 'Erro ao carregar cidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return { cities, loading, error, reload }
}
