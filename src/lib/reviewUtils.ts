import {
  collection, doc, addDoc, updateDoc, deleteField,
  query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Review } from '@/types'

interface SubmitReviewInput {
  providerId: string
  clientId: string
  clientName: string
  clientAvatar: string
  rating: number
  comment: string
  chatId?: string
  reviewerRole?: 'client' | 'provider'  // ← qual perfil assina a avaliação
}

// Cria ou atualiza avaliação (1 por cliente/prestador)
export const submitReview = async (input: SubmitReviewInput): Promise<void> => {
  const {
    providerId,
    clientId,
    clientName,
    clientAvatar,
    rating,
    comment,
    chatId,
    reviewerRole = 'client',
  } = input

  if (rating < 1 || rating > 5) throw new Error('Nota inválida')
  if (!providerId || !clientId) throw new Error('IDs inválidos')
  if (clientId === providerId) throw new Error('Você não pode avaliar a si mesmo')

  const existing = await getUserReviewForProvider(clientId, providerId)

  const payload = {
    providerId,
    clientId,
    clientName,
    clientAvatar,
    rating,
    comment: comment.trim(),
    verified: !!chatId,
    chatId: chatId || null,
    reviewerRole,
    updatedAt: serverTimestamp(),
  }

  if (existing) {
    await updateDoc(doc(db, 'reviews', existing.id), payload)
  } else {
    await addDoc(collection(db, 'reviews'), {
      ...payload,
      createdAt: serverTimestamp(),
    })
  }
}

// Busca avaliação existente de um cliente para um prestador
export const getUserReviewForProvider = async (
  clientId: string,
  providerId: string
): Promise<Review | null> => {
  if (!clientId || !providerId) return null

  const q = query(
    collection(db, 'reviews'),
    where('clientId', '==', clientId),
    where('providerId', '==', providerId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Review
}

// Prestador responde a uma avaliação
export const replyToReview = async (
  reviewId: string,
  reply: { text: string }
): Promise<void> => {
  if (!reviewId || !reply.text.trim()) throw new Error('Resposta inválida')

  await updateDoc(doc(db, 'reviews', reviewId), {
    reply: {
      text: reply.text.trim(),
      createdAt: serverTimestamp(),
    },
  })
}

// Prestador exclui sua resposta
export const deleteReply = async (reviewId: string): Promise<void> => {
  if (!reviewId) throw new Error('ID inválido')

  await updateDoc(doc(db, 'reviews', reviewId), {
    reply: deleteField(),
  })
}
