import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, writeBatch, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from './useSimpleAuth'

export interface AppNotification {
  id: string
  type: 'service_request' | 'media_comment'
  read: boolean
  createdAt: any
  // service_request
  clientName?: string
  clientAvatar?: string
  service?: string
  // media_comment
  commenterId?: string
  commenterName?: string
  commenterAvatar?: string
  commentText?: string
  mediaId?: string
  mediaType?: 'photo' | 'video' | 'audio'
}

interface UseNotificationsResult {
  count: number           // total de notificações não lidas (todas as fontes)
  commentCount: number    // somente comentários não lidos
  loading: boolean
  markAllRead: () => Promise<void>
}

export const useNotifications = (): UseNotificationsResult => {
  const { user } = useSimpleAuth()
  const [pendingRequests, setPendingRequests] = useState(0)
  const [unreadComments, setUnreadComments] = useState(0)
  const [loading, setLoading] = useState(true)

  // ── 1. Escuta solicitações de serviço pendentes (comportamento original) ──
  useEffect(() => {
    if (!user?.id || !user.roles?.includes('provider')) {
      setPendingRequests(0)
      return
    }

    const q = query(
      collection(db, 'serviceRequests'),
      where('providerId', '==', user.id),
      where('status', '==', 'pending')
    )

    const unsub = onSnapshot(
      q,
      (snap) => setPendingRequests(snap.size),
      (err) => console.error('[useNotifications] serviceRequests:', err)
    )

    return () => unsub()
  }, [user?.id, user?.roles])

  // ── 2. Escuta comentários não lidos na sub-coleção de notificações ────────
  useEffect(() => {
    if (!user?.id || !user.roles?.includes('provider')) {
      setUnreadComments(0)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'notifications', user.id, 'items'),
      where('type', '==', 'media_comment'),
      where('read', '==', false)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setUnreadComments(snap.size)
        setLoading(false)
      },
      (err) => {
        console.error('[useNotifications] media_comment:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [user?.id, user?.roles])

  // ── Marcar todos os comentários como lidos ───────────────────────────────
  const markAllRead = async () => {
    if (!user?.id) return
    try {
      const q = query(
        collection(db, 'notifications', user.id, 'items'),
        where('type', '==', 'media_comment'),
        where('read', '==', false)
      )
      const snap = await getDocs(q)
      if (snap.empty) return

      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.update(d.ref, { read: true }))
      await batch.commit()
    } catch (err) {
      console.error('[useNotifications] markAllRead:', err)
    }
  }

  return {
    count: pendingRequests + unreadComments,
    commentCount: unreadComments,
    loading,
    markAllRead,
  }
}
