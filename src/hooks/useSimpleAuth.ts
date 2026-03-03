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
    console.log('🔥 [useSimpleAuth] Iniciando listener...')
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 [useSimpleAuth] onAuthStateChanged disparou')
      console.log('🔥 [useSimpleAuth] firebaseUser:', firebaseUser)
      
      if (firebaseUser) {
        console.log('✅ [useSimpleAuth] Usuário logado:', firebaseUser.email)
        console.log('✅ [useSimpleAuth] UID:', firebaseUser.uid)
        console.log('✅ [useSimpleAuth] photoURL:', firebaseUser.photoURL)
        console.log('✅ [useSimpleAuth] displayName:', firebaseUser.displayName)
        
        setFirebaseUser(firebaseUser)
        
        try {
          console.log('📄 [useSimpleAuth] Buscando doc no Firestore...')
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          console.log('📄 [useSimpleAuth] userDoc.exists():', userDoc.exists())
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            console.log('✅ [useSimpleAuth] Dados do Firestore:', userData)
            
            const fullUser = { 
              ...userData, 
              id: firebaseUser.uid,
              avatar: userData.avatar || firebaseUser.photoURL || undefined,
              name: userData.name || firebaseUser.displayName || 'Usuário'
            }
            
            console.log('✅ [useSimpleAuth] User final:', fullUser)
            setUser(fullUser)
          } else {
            console.log('⚠️ [useSimpleAuth] Doc não existe, usando fallback')
            
            const fallbackUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || 'Usuário',
              avatar: firebaseUser.photoURL || undefined,
              roles: ['client'],
              clientProfile: {},
              createdAt: new Date().toISOString(),
            }
            
            console.log('✅ [useSimpleAuth] User fallback:', fallbackUser)
            setUser(fallbackUser)
          }
        } catch (error) {
          console.error('❌ [useSimpleAuth] Erro ao buscar Firestore:', error)
          
          const errorUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || 'Usuário',
            avatar: firebaseUser.photoURL || undefined,
            roles: ['client'],
            clientProfile: {},
            createdAt: new Date().toISOString(),
          }
          
          console.log('⚠️ [useSimpleAuth] User em erro:', errorUser)
          setUser(errorUser)
        }
      } else {
        console.log('❌ [useSimpleAuth] Nenhum usuário logado')
        setUser(null)
        setFirebaseUser(null)
      }
      
      console.log('🏁 [useSimpleAuth] setLoading(false)')
      setLoading(false)
    })

    return () => {
      console.log('🔥 [useSimpleAuth] Limpando listener')
      unsubscribe()
    }
  }, [])

  const signOut = async () => {
    console.log('🚪 [useSimpleAuth] Fazendo logout...')
    await firebaseSignOut(auth)
    setUser(null)
    setFirebaseUser(null)
    console.log('🚪 [useSimpleAuth] Logout concluído')
  }

  const isClient = user?.roles?.includes('client') || false
  const isProvider = user?.roles?.includes('provider') || false

  // ❌ REMOVIDO: console.log que estava causando re-render infinito
  // console.log('🎯 [useSimpleAuth] Estado atual:', { user: user?.email, loading, isClient, isProvider })

  return {
    user,
    firebaseUser,
    loading,
    isClient,
    isProvider,
    signOut,
  }
}
