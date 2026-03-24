import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MediaComment } from '@/types'
import { sendCommentNotification } from '@/lib/commentNotificationUtils'

interface UseCommentsResult {
  comments: MediaComment[]
  loading: boolean
  error: string | null
  addComment: (text: string, user: CommentUser) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  toggleLike: (commentId: string, userId: string) => Promise<void>
}

export interface CommentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
}

/**
 * Hook para gerenciar comentários de uma mídia do portfólio.
 *
 * Caminho Firestore:
 *   providers/{providerId}/portfolio/{mediaId}/comments
 */
export const useComments = (
  providerId: string | undefined,
  mediaId: string | undefined,
  mediaType?: 'photo' | 'video' | 'audio'
): UseCommentsResult => {
  const [comments, setComments] = useState<MediaComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Escuta em tempo real ──────────────────────────────────────────────────
  useEffect(() => {
    if (!providerId || !mediaId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const commentsRef = collection(
      db,
      'providers', providerId,
      'portfolio', mediaId,
      'comments'
    )

    const q = query(commentsRef, orderBy('createdAt', 'desc'))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaComment))
        setComments(data)
        setLoading(false)
      },
      (err) => {
        console.error('[useComments] Erro ao escutar comentários:', err)
        setError('Não foi possível carregar os comentários.')
        setLoading(false)
      }
    )

    return () => unsub()
  }, [providerId, mediaId])

  // ── Adicionar comentário ──────────────────────────────────────────────────
  const addComment = useCallback(
    async (text: string, user: CommentUser) => {
      if (!providerId || !mediaId) return
      if (!text.trim()) return

      const commentsRef = collection(
        db,
        'providers', providerId,
        'portfolio', mediaId,
        'comments'
      )

      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName ?? 'Usuário',
        userAvatar: user.photoURL ?? '',
        text: text.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      })

      // ── Notificar o prestador (best-effort) ──────────────────────────────
      await sendCommentNotification({
        providerId,
        mediaId,
        mediaType: mediaType ?? 'photo',
        commenterId: user.uid,
        commenterName: user.displayName ?? 'Usuário',
        commenterAvatar: user.photoURL ?? '',
        commentText: text.trim(),
      })
    },
    [providerId, mediaId, mediaType]
  )

  // ── Deletar comentário ────────────────────────────────────────────────────
  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!providerId || !mediaId) return

      const commentDoc = doc(
        db,
        'providers', providerId,
        'portfolio', mediaId,
        'comments', commentId
      )

      await deleteDoc(commentDoc)
    },
    [providerId, mediaId]
  )

  // ── Curtir / descurtir ────────────────────────────────────────────────────
  const toggleLike = useCallback(
    async (commentId: string, userId: string) => {
      if (!providerId || !mediaId) return

      const commentDoc = doc(
        db,
        'providers', providerId,
        'portfolio', mediaId,
        'comments', commentId
      )

      const alreadyLiked = comments
        .find(c => c.id === commentId)
        ?.likedBy?.includes(userId) ?? false

      await updateDoc(commentDoc, {
        likes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(userId) : arrayUnion(userId),
      })
    },
    [providerId, mediaId, comments]
  )

  return { comments, loading, error, addComment, deleteComment, toggleLike }
}
