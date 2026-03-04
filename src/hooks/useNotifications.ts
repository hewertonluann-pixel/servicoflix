import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from './useSimpleAuth'

export const useNotifications = () => {
  const { user } = useSimpleAuth()
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !user.roles?.includes('provider')) {
      setCount(0)
      setLoading(false)
      return
    }

    // Listener em tempo real
    const q = query(
      collection(db, 'serviceRequests'),
      where('providerId', '==', user.id),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setCount(snapshot.size)
        setLoading(false)
      },
      (error) => {
        console.error('Erro ao escutar notificações:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.id, user?.roles])

  return { count, loading }
}
