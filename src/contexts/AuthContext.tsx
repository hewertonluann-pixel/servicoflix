/**
 * AuthContext.tsx — Fonte única de verdade para autenticação.
 *
 * O listener do Firebase Auth é criado UMA única vez aqui.
 * Todos os componentes que chamam useSimpleAuth() leem deste contexto,
 * sem criar novos listeners.
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'
import { getAvatarUrl } from '@/lib/avatarUtils'
import { registerFCMToken, unregisterFCMToken, onForegroundMessage } from '@/lib/fcm'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  isClient: boolean
  isProvider: boolean
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Helper: retry para erros de offline ──────────────────────────────────────

async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLast = i === maxRetries - 1
      const isOffline = error?.code === 'unavailable' || error?.message?.includes('offline')
      if (isLast || !isOffline) throw error
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [fcmUid, setFcmUid] = useState<string | null>(null)

  // ── Listener Firebase Auth (único em todo o app) ──────────────────────────
  useEffect(() => {
    console.log('🔥 [AuthContext] Iniciando listener (único)...')

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 [AuthContext] Auth mudou:', firebaseUser?.email || 'sem user')

      if (firebaseUser) {
        setFbUser(firebaseUser)

        // Usuário básico imediato
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

        // Mescla com Firestore
        try {
          const userDoc = await fetchWithRetry(
            () => getDoc(doc(db, 'users', firebaseUser.uid)),
            3,
            1000
          )
          if (userDoc.exists()) {
            const firestoreData = userDoc.data() as User
            const resolvedAvatar = getAvatarUrl(firestoreData, firebaseUser.photoURL)
            const completeUser: User = {
              ...firestoreData,
              id: firebaseUser.uid,
              avatar: resolvedAvatar || undefined,
              name: firestoreData.name || firebaseUser.displayName || basicUser.name,
            }
            console.log('✅ [AuthContext] Avatar resolvido:', resolvedAvatar)
            setUser(completeUser)
          }
        } catch (error) {
          console.error('❌ [AuthContext] Erro Firestore após retries:', error)
        }
      } else {
        setUser(null)
        setFbUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // ── FCM: registra/remove token conforme auth ──────────────────────────────
  useEffect(() => {
    if (user?.id && fcmUid !== user.id) {
      setFcmUid(user.id)
      registerFCMToken(user.id)
    }
    if (!user && fcmUid) {
      unregisterFCMToken(fcmUid)
      setFcmUid(null)
    }
  }, [user?.id])

  // ── FCM: mensagens em foreground ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const unsub = onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'Servicoflix'
      const body  = payload.notification?.body  || 'Nova notificação'
      const url   = payload.data?.url as string | undefined
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, { body, icon: '/icon-192.png' })
        if (url) n.onclick = () => { window.focus(); window.location.assign(url) }
      }
    })
    return () => unsub()
  }, [user?.id])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setFbUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    firebaseUser: fbUser,
    loading,
    isClient:   user?.roles?.includes('client')   ?? false,
    isProvider: user?.roles?.includes('provider') ?? false,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook público ──────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
