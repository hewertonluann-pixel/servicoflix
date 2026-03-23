import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Review } from '@/types'

export interface RatingDistribution {
  5: number
  4: number
  3: number
  2: number
  1: number
}

interface UseReviewsResult {
  reviews: Review[]
  loading: boolean
  averageRating: number
  reviewCount: number
  distribution: RatingDistribution
}

export const useReviews = (providerId: string | undefined): UseReviewsResult => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!providerId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))
      setReviews(data)
      setLoading(false)
    }, (err) => {
      console.error('[useReviews] Erro:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [providerId])

  // Calcula média
  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  // Calcula distribuição percentual por estrela
  const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  if (reviews.length > 0) {
    ;[5, 4, 3, 2, 1].forEach((star) => {
      const count = reviews.filter(r => r.rating === star).length
      distribution[star as keyof RatingDistribution] = Math.round((count / reviews.length) * 100)
    })
  }

  return {
    reviews,
    loading,
    averageRating,
    reviewCount: reviews.length,
    distribution,
  }
}
