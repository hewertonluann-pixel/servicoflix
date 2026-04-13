import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { ProviderStatus } from '@/types'

interface PrestadorStatusReturn {
  diasScore: number           // dias restantes (calculado em tempo real)
  status: ProviderStatus | null
  estaAtivo: boolean          // scoreExpiresAt no futuro
  estaExpirando: boolean      // diasScore <= 7 && diasScore > 0
  estaCritico: boolean        // diasScore <= 3 && diasScore > 0
  estaExpirado: boolean       // scoreExpiresAt expirado ou inexistente
  temAssinatura: boolean      // tem stripeSubscriptionId ativo
  loading: boolean
}

/**
 * Calcula dias restantes em tempo real a partir de scoreExpiresAt.
 * Evita usar diasScore do banco (valor estático que envelhece com o tempo).
 */
function calcDiasRestantes(scoreExpiresAt: any): number {
  if (!scoreExpiresAt) return 0
  const ms =
    typeof scoreExpiresAt.toMillis === 'function'
      ? scoreExpiresAt.toMillis()
      : (scoreExpiresAt.seconds ?? 0) * 1000
  const diff = ms - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
    if (!user || !isProvider) {
      setLoading(false)
      return
    }

    const userRef = doc(db, 'users', user.id)

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const providerProfile = data?.providerProfile

        // Calcula dias restantes dinamicamente — não usa diasScore salvo no banco
        const dias = calcDiasRestantes(providerProfile?.scoreExpiresAt)
        setDiasScore(dias)
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

  const estaAtivo = diasScore > 0 || temAssinatura

  return {
    diasScore,
    status,
    estaAtivo,
    estaExpirando: diasScore <= 7 && diasScore > 0 && !temAssinatura,
    estaCritico: diasScore <= 3 && diasScore > 0 && !temAssinatura,
    estaExpirado: !estaAtivo,
    temAssinatura,
    loading,
  }
}
