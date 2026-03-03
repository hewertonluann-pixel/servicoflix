import { useState, useEffect } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔥 [useSimpleAuth] Iniciando listener...')
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 [useSimpleAuth] Auth mudou:', firebaseUser?.email || 'sem user')
      
      if (firebaseUser) {
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
        
        // 2️⃣ DEPOIS: Busca dados completos do Firestore (em background)
        try {
          console.log('📄 [useSimpleAuth] Buscando Firestore...')
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const firestoreData = userDoc.data() as User
            const completeUser: User = {
              ...firestoreData,
              id: firebaseUser.uid,
              avatar: firestoreData.avatar || firebaseUser.photoURL || undefined,
              name: firestoreData.name || firebaseUser.displayName || basicUser.name,
            }
            console.log('✅ [useSimpleAuth] Dados Firestore mesclados')
            setUser(completeUser) // Atualiza com dados completos
          } else {
            console.log('⚠️ [useSimpleAuth] Doc não existe, usando básico')
          }
        } catch (error) {
          console.error('❌ [useSimpleAuth] Erro Firestore:', error)
          // Mantém user básico em caso de erro
        }
      } else {
        console.log('❌ [useSimpleAuth] Sem usuário')
        setUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    console.log('🚪 [useSimpleAuth] Logout...')
    await firebaseSignOut(auth)
    setUser(null)
  }

  const isClient = user?.roles?.includes('client') ?? false
  const isProvider = user?.roles?.includes('provider') ?? false

  return {
    user,
    loading,
    isClient,
    isProvider,
    signOut,
  }
}
