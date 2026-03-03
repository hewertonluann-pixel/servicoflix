import { useState, useEffect } from 'react'
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, UserRole, ProviderProfile } from '@/types'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Carrega dados do usuário do Firestore
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User
        setUser({ ...userData, id: firebaseUser.uid })
      } else {
        // Primeiro acesso - cria perfil básico de cliente
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || 'Usuário',
          avatar: firebaseUser.photoURL || undefined,
          roles: ['client'], // Começa como cliente
          createdAt: new Date().toISOString(),
          clientProfile: {},
        }
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
        })
        
        setUser(newUser)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        await loadUserData(firebaseUser)
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Funções de autenticação
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(firebaseUser, { displayName: name })
    await loadUserData(firebaseUser)
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    try {
      // Usa popup - mais compatível e evita problemas de estado
      const result = await signInWithPopup(auth, provider)
      
      if (result.user) {
        await loadUserData(result.user)
      }
    } catch (error: any) {
      // Só lança erro se não for cancelamento pelo usuário
      if (error.code !== 'auth/popup-closed-by-user' && 
          error.code !== 'auth/cancelled-popup-request') {
        throw error
      }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  // Funções de perfil duplo
  const isClient = user?.roles?.includes('client') || false
  const isProvider = user?.roles?.includes('provider') || false
  const hasProviderProfile = user?.providerProfile !== undefined

  // Converte conta em prestador
  const upgradeToProvider = async (providerData: ProviderProfile) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      const newRoles = user.roles.includes('provider') 
        ? user.roles 
        : [...user.roles, 'provider']

      await updateDoc(doc(db, 'users', user.id), {
        roles: newRoles,
        providerProfile: providerData,
        updatedAt: serverTimestamp(),
      })

      // Atualiza estado local
      setUser({
        ...user,
        roles: newRoles as UserRole[],
        providerProfile: providerData,
      })

      return true
    } catch (error) {
      console.error('Erro ao atualizar para prestador:', error)
      throw error
    }
  }

  // Atualiza perfil de prestador
  const updateProviderProfile = async (providerData: Partial<ProviderProfile>) => {
    if (!user || !isProvider) throw new Error('Usuário não é prestador')
    
    try {
      const updatedProfile = { ...user.providerProfile, ...providerData }
      
      await updateDoc(doc(db, 'users', user.id), {
        providerProfile: updatedProfile,
        updatedAt: serverTimestamp(),
      })

      setUser({
        ...user,
        providerProfile: updatedProfile as ProviderProfile,
      })

      return true
    } catch (error) {
      console.error('Erro ao atualizar perfil de prestador:', error)
      throw error
    }
  }

  // Atualiza perfil de cliente
  const updateClientProfile = async (clientData: any) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      const updatedProfile = { ...user.clientProfile, ...clientData }
      
      await updateDoc(doc(db, 'users', user.id), {
        clientProfile: updatedProfile,
        updatedAt: serverTimestamp(),
      })

      setUser({
        ...user,
        clientProfile: updatedProfile,
      })

      return true
    } catch (error) {
      console.error('Erro ao atualizar perfil de cliente:', error)
      throw error
    }
  }

  return {
    user,
    firebaseUser,
    loading,
    isClient,
    isProvider,
    hasProviderProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    upgradeToProvider,
    updateProviderProfile,
    updateClientProfile,
  }
}
