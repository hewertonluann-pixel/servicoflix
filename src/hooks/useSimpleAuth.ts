import { useState, useEffect } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'
import { getAvatarUrl } from '@/lib/avatarUtils'

const fetchWithRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1
      const isOfflineError = error?.code === 'unavailable' || error?.message?.includes('offline')
      if (isLastAttempt || !isOfflineError) throw error
      console.log(`🔁 [useSimpleAuth] Tentativa ${i + 1}/${maxRetries} falhou, tentando novamente em ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔥 [useSimpleAuth] Iniciando listener...')

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 [useSimpleAuth] Auth mudou:', firebaseUser?.email || 'sem user')

      if (firebaseUser) {
        setFbUser(firebaseUser)

        // 1️⃣ User básico imediato (usa foto do Google como fallback)
        const basicUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          avatar: firebaseUser.photoURL || undefined,
          roles: ['client'],
          clientProfile: {},
          createdAt: new Date().toISOString(),
        }
        setUser(basicUser)
        setLoading(false)

        // 2️⃣ Mescla com Firestore e resolve avatar pela regra centralizada
        try {
          const userDoc = await fetchWithRetry(
            () => getDoc(doc(db, 'users', firebaseUser.uid)),
            3,
            1000
          )

          if (userDoc.exists()) {
            const firestoreData = userDoc.data() as User
            const resolvedAvatar = getAvatarUrl(
              firestoreData,
              firebaseUser.photoURL
            )
            const completeUser: User = {
              ...firestoreData,
              id: firebaseUser.uid,
              avatar: resolvedAvatar || undefined,
              name: firestoreData.name || firebaseUser.displayName || basicUser.name,
            }
            console.log('✅ [useSimpleAuth] Avatar resolvido:', resolvedAvatar)
            setUser(completeUser)
          }
        } catch (error) {
          console.error('❌ [useSimpleAuth] Erro Firestore após retries:', error)
        }
      } else {
        setUser(null)
        setFbUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setFbUser(null)
  }

  const isClient = user?.roles?.includes('client') ?? false
  const isProvider = user?.roles?.includes('provider') ?? false

  return {
    user,
    firebaseUser: fbUser,
    loading,
    isClient,
    isProvider,
    signOut,
  }
}
