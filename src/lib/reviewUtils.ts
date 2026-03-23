import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getChatId } from '@/lib/chatUtils'
import { Review, ReviewReply } from '@/types'

// ─── Submeter ou editar avaliação ────────────────────────────────────────────

export interface SubmitReviewData {
  providerId: string
  clientId: string
  clientName: string
  clientAvatar: string
  rating: number
  comment: string
  chatId?: string
}

export const submitReview = async (data: SubmitReviewData): Promise<void> => {
  if (data.clientId === data.providerId) {
    throw new Error('Você não pode avaliar a si mesmo.')
  }

  // ID determinístico — 1 review por cliente por prestador
  const reviewId = `${data.clientId}_${data.providerId}`
  const reviewRef = doc(db, 'reviews', reviewId)
  const existing = await getDoc(reviewRef)

  // Badge "Serviço verificado": verifica se existe chat entre os dois
  const verified = await hasChattedWithProvider(data.clientId, data.providerId)

  if (existing.exists()) {
    // Edição
    await updateDoc(reviewRef, {
      rating: data.rating,
      comment: data.comment,
      verified,
      updatedAt: serverTimestamp(),
    })
  } else {
    // Nova avaliação
    await setDoc(reviewRef, {
      id: reviewId,
      providerId: data.providerId,
      clientId: data.clientId,
      clientName: data.clientName,
      clientAvatar: data.clientAvatar,
      rating: data.rating,
      comment: data.comment,
      verified,
      chatId: data.chatId || null,
      reply: null,
      createdAt: serverTimestamp(),
      updatedAt: null,
    })
  }

  await recalculateRating(data.providerId)
}

// ─── Recalcular média e total de avaliações do prestador ─────────────────────

export const recalculateRating = async (providerId: string): Promise<void> => {
  const q = query(
    collection(db, 'reviews'),
    where('providerId', '==', providerId)
  )
  const snap = await getDocs(q)

  if (snap.empty) {
    await updateDoc(doc(db, 'users', providerId), {
      'providerProfile.rating': 0,
      'providerProfile.reviewCount': 0,
    })
    return
  }

  const ratings = snap.docs.map(d => d.data().rating as number)
  const total = ratings.length
  const average = ratings.reduce((sum, r) => sum + r, 0) / total
  const rounded = Math.round(average * 10) / 10 // ex: 4.7

  await updateDoc(doc(db, 'users', providerId), {
    'providerProfile.rating': rounded,
    'providerProfile.reviewCount': total,
  })
}

// ─── Buscar review do usuário para um prestador específico ───────────────────

export const getUserReviewForProvider = async (
  clientId: string,
  providerId: string
): Promise<Review | null> => {
  const reviewId = `${clientId}_${providerId}`
  const snap = await getDoc(doc(db, 'reviews', reviewId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Review
}

// ─── Verificar se existe chat entre cliente e prestador ──────────────────────

export const hasChattedWithProvider = async (
  clientId: string,
  providerId: string
): Promise<boolean> => {
  // chatId é determinístico — não precisa de query
  const chatId = getChatId(clientId, providerId)
  const snap = await getDoc(doc(db, 'chats', chatId))
  return snap.exists()
}

// ─── Prestador responde uma avaliação ────────────────────────────────────────

export const replyToReview = async (
  reviewId: string,
  reply: Omit<ReviewReply, 'createdAt'>
): Promise<void> => {
  await updateDoc(doc(db, 'reviews', reviewId), {
    reply: {
      ...reply,
      createdAt: serverTimestamp(),
    },
  })
}

// ─── Deletar resposta do prestador ───────────────────────────────────────────

export const deleteReply = async (reviewId: string): Promise<void> => {
  await updateDoc(doc(db, 'reviews', reviewId), {
    reply: null,
  })
}
