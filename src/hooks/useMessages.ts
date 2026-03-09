import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Message } from '@/lib/chatUtils'

/**
 * Escuta em tempo real as mensagens de um chat.
 * Retorna as últimas 100 mensagens ordenadas por data.
 */
export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: Message[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Message, 'id'>),
        }))
        setMessages(msgs)
        setLoading(false)
      },
      (err) => {
        console.error('[useMessages] Erro:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [chatId])

  return { messages, loading }
}
