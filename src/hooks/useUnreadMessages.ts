import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from './useSimpleAuth'

/**
 * Retorna o total de mensagens não lidas em todos os chats do usuário logado.
 * Atualiza em tempo real via onSnapshot.
 */
export const useUnreadMessages = () => {
  const { user } = useSimpleAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.id)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        let total = 0
        snap.docs.forEach((d) => {
          const data = d.data()
          total += data.unreadCount?.[user.id] || 0
        })
        setUnreadCount(total)
      },
      (err) => {
        console.error('[useUnreadMessages]', err)
      }
    )

    return () => unsub()
  }, [user?.id])

  return { unreadCount }
}
