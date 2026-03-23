import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Observa em tempo real o array blockedUsers do usuário autenticado.
 * Retorna a lista de UIDs bloqueados e um helper isBlocked(uid).
 */
export const useBlockedUsers = (myId: string | undefined) => {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])

  useEffect(() => {
    if (!myId) return

    const unsub = onSnapshot(doc(db, 'users', myId), (snap) => {
      setBlockedUsers(snap.data()?.blockedUsers || [])
    })

    return () => unsub()
  }, [myId])

  const isBlocked = (uid: string): boolean => blockedUsers.includes(uid)

  return { blockedUsers, isBlocked }
}
