import { useState, useEffect } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[useSimpleAuth] Auth state changed:', firebaseUser?.email)
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          // Busca dados do Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            console.log('[useSimpleAuth] Dados do usuário:', userData)
            setUser({ ...userData, id: firebaseUser.uid })
          } else {
            // Fallback: dados básicos do Firebase
            console.log('[useSimpleAuth] Usando dados do Firebase Auth')
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || 'Usuário',
              avatar: firebaseUser.photoURL || undefined,
              roles: ['client'],
              clientProfile: {},
              createdAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error('[useSimpleAuth] Erro ao carregar dados:', error)
          // Fallback em caso de erro
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || 'Usuário',
            avatar: firebaseUser.photoURL || undefined,
            roles: ['client'],
            clientProfile: {},
            createdAt: new Date().toISOString(),
          })
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const isClient = user?.roles?.includes('client') || false
  const isProvider = user?.roles?.includes('provider') || false

  return {
    user,
    firebaseUser,
    loading,
    isClient,
    isProvider,
    signOut,
  }
}
