import { useState, useEffect } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

// Função helper para retry automático
const fetchWithRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1
      const isOfflineError = error?.code === 'unavailable' || error?.message?.includes('offline')
      
      if (isLastAttempt || !isOfflineError) {
        throw error
      }
      
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
        
        // 1️⃣ PRIMEIRO: Seta user básico do Firebase (IMEDIATO)
        const basicUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          avatar: firebaseUser.photoURL || undefined,
          roles: ['client'],
          clientProfile: {},
          createdAt: new Date().toISOString(),
        }
        
        console.log('✅ [useSimpleAuth] User básico setado:', basicUser.email)
        setUser(basicUser)
        setLoading(false) // Libera UI IMEDIATAMENTE
        
        // 2️⃣ DEPOIS: Busca dados completos do Firestore (com retry)
        try {
          console.log('📄 [useSimpleAuth] Buscando Firestore (com retry)...')
          
          const userDoc = await fetchWithRetry(
            () => getDoc(doc(db, 'users', firebaseUser.uid)),
            3, // 3 tentativas
            1000 // 1 segundo entre tentativas
          )
          
          if (userDoc.exists()) {
            const firestoreData = userDoc.data() as User
            const completeUser: User = {
              ...firestoreData,
              id: firebaseUser.uid,
              avatar: firestoreData.avatar || firebaseUser.photoURL || undefined,
              name: firestoreData.name || firebaseUser.displayName || basicUser.name,
            }
            console.log('✅ [useSimpleAuth] Dados Firestore mesclados')
            setUser(completeUser)
          } else {
            console.log('⚠️ [useSimpleAuth] Doc não existe, usando básico')
          }
        } catch (error) {
          console.error('❌ [useSimpleAuth] Erro Firestore após retries:', error)
        }
      } else {
        console.log('❌ [useSimpleAuth] Sem usuário')
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
    firebaseUser: fbUser, // ✅ exportado!
    loading,
    isClient,
    isProvider,
    signOut,
  }
}
