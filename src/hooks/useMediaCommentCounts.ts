import { useEffect, useState } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Escuta em tempo real a contagem de comentários para cada mediaId
 * informado. Retorna um Record<mediaId, count>.
 *
 * Só inicializa os listeners quando `providerId` e `mediaIds` são válidos.
 * Cada mediaId vira um listener independente — o Firestore cobra 1 leitura
 * por snapshot, não por documento, por isso é eficiente mesmo com vários itens.
 */
export const useMediaCommentCounts = (
  providerId: string | undefined,
  mediaIds: string[]
): Record<string, number> => {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!providerId || mediaIds.length === 0) return

    const unsubs: (() => void)[] = []

    mediaIds.forEach((mediaId) => {
      const commentsRef = collection(
        db,
        'providers', providerId,
        'portfolio', mediaId,
        'comments'
      )

      const unsub = onSnapshot(
        query(commentsRef),
        (snap) => {
          setCounts(prev => ({
            ...prev,
            [mediaId]: snap.size,
          }))
        },
        (err) => console.warn(`[useMediaCommentCounts] ${mediaId}:`, err)
      )

      unsubs.push(unsub)
    })

    return () => unsubs.forEach(u => u())
    // mediaIds como depêndencia: usar JSON.stringify para estabilizar arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, JSON.stringify(mediaIds)])

  return counts
}
