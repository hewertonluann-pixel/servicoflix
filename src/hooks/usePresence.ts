import { useEffect } from 'react'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from './useSimpleAuth'

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutos

/**
 * Publica a presença do usuário logado em /presence/{uid}
 * e retorna uma função para observar a presença de outro usuário.
 */
export const usePresence = () => {
  const { user } = useSimpleAuth()

  // Atualiza o lastSeen do usuário atual a cada 60s e ao montar
  useEffect(() => {
    if (!user?.id) return

    const presenceRef = doc(db, 'presence', user.id)

    const update = () =>
      setDoc(presenceRef, { lastSeen: serverTimestamp(), uid: user.id }, { merge: true }).catch(
        () => {}
      )

    update()
    const interval = setInterval(update, 60_000)

    // Marca como offline ao fechar a aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Usa sendBeacon-like: atualiza com timestamp fixo de 10 min atrás
        // para que a presença expire rapidamente
        setDoc(
          presenceRef,
          { lastSeen: new Date(Date.now() - ONLINE_THRESHOLD_MS - 1000), uid: user.id },
          { merge: true }
        ).catch(() => {})
      } else {
        update()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])
}

/**
 * Observa a presença de um usuário específico em tempo real.
 * Retorna { isOnline, lastSeen, loading }
 */
export const useUserPresence = (uid: string | null | undefined) => {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    const presenceRef = doc(db, 'presence', uid)

    const unsub = onSnapshot(
      presenceRef,
      (snap) => {
        if (!snap.exists()) {
          setIsOnline(false)
          setLastSeen(null)
          setLoading(false)
          return
        }

        const data = snap.data()
        const lastSeenDate: Date = data.lastSeen?.toDate
          ? data.lastSeen.toDate()
          : new Date(data.lastSeen)

        const diffMs = Date.now() - lastSeenDate.getTime()
        setIsOnline(diffMs <= ONLINE_THRESHOLD_MS)
        setLastSeen(lastSeenDate)
        setLoading(false)
      },
      () => setLoading(false)
    )

    return () => unsub()
  }, [uid])

  return { isOnline, lastSeen, loading }
}

/**
 * Formata o lastSeen para exibição amigável.
 * Ex: "Visto às 14h32" | "Visto hoje às 09h10" | "Visto ontem"
 */
export const formatLastSeen = (date: Date | null): string => {
  if (!date) return 'Não visto recentemente'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'Agora mesmo'
  if (diffMin < 60) return `Visto há ${diffMin} min`

  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Visto às ${time}`
  if (isYesterday) return `Visto ontem às ${time}`
  return `Visto em ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
}
