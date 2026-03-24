import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { ProviderStatus } from '@/types'

interface PrestadorStatusReturn {
  diasScore: number           // dias restantes
  status: ProviderStatus | null
  estaAtivo: boolean          // status === 'ativo' && diasScore > 0
  estaExpirando: boolean      // diasScore <= 7 && diasScore > 0
  estaCritico: boolean        // diasScore <= 3 && diasScore > 0
  estaExpirado: boolean       // status === 'expirado' || diasScore === 0
  temAssinatura: boolean      // tem stripeSubscriptionId ativo
  loading: boolean
}

/**
 * Hook para acompanhar o status de créditos do prestador logado.
 * Atualiza em tempo real via onSnapshot do Firestore.
 */
export function usePrestadorStatus(): PrestadorStatusReturn {
  const { user, isProvider } = useAuth()

  const [diasScore, setDiasScore] = useState<number>(0)
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [temAssinatura, setTemAssinatura] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Só escuta se for prestador
    if (!user || !isProvider) {
      setLoading(false)
      return
    }

    // Escuta em tempo real o documento do usuário
    const userRef = doc(db, 'users', user.id)

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const providerProfile = data?.providerProfile

        setDiasScore(providerProfile?.diasScore ?? 0)
        setStatus(providerProfile?.status ?? null)
        setTemAssinatura(!!providerProfile?.stripeSubscriptionId)
      }
      setLoading(false)
    }, (error) => {
      console.error('Erro ao escutar status do prestador:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, isProvider])

  return {
    diasScore,
    status,
    estaAtivo: status === 'ativo' && diasScore > 0,
    estaExpirando: diasScore <= 7 && diasScore > 0,
    estaCritico: diasScore <= 3 && diasScore > 0,
    estaExpirado: status === 'expirado' || diasScore === 0,
    temAssinatura,
    loading,
  }
}
