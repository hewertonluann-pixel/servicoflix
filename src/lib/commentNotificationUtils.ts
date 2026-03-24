import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CommentNotificationPayload {
  providerId: string          // quem recebe a notificação
  mediaId: string             // ID da mídia comentada
  mediaType: 'photo' | 'video' | 'audio'
  commenterId: string         // quem comentou
  commenterName: string
  commenterAvatar: string
  commentText: string
}

/**
 * Grava uma notificação do tipo 'media_comment' na coleção
 * `notifications/{providerId}/items`.
 *
 * Regra: não notifica o próprio prestador quando ele comenta na própria mídia.
 */
export const sendCommentNotification = async (
  payload: CommentNotificationPayload
): Promise<void> => {
  // Não notificar o próprio prestador
  if (payload.commenterId === payload.providerId) return

  try {
    await addDoc(
      collection(db, 'notifications', payload.providerId, 'items'),
      {
        type: 'media_comment',
        read: false,
        mediaId: payload.mediaId,
        mediaType: payload.mediaType,
        commenterId: payload.commenterId,
        commenterName: payload.commenterName,
        commenterAvatar: payload.commenterAvatar,
        commentText: payload.commentText.slice(0, 120),
        createdAt: serverTimestamp(),
      }
    )
  } catch (err) {
    // Notificação é best-effort: não bloqueia o comentário se falhar
    console.warn('[commentNotification] Falha ao gravar notificação:', err)
  }
}
