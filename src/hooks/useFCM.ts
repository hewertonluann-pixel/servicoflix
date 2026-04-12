/**
 * useFCM.ts — Integra o Firebase Cloud Messaging ao ciclo de vida do usuário.
 *
 * - Registra o token FCM no Firestore logo após o login
 * - Remove o token no logout
 * - Exibe toast nativo para mensagens recebidas com o app aberto (foreground)
 */
import { useEffect, useRef } from 'react'
import { registerFCMToken, unregisterFCMToken, onForegroundMessage } from '@/lib/fcm'
import { useSimpleAuth } from './useSimpleAuth'

/** Exibe uma notificação nativa do browser sem depender de lib externa. */
function showToast(title: string, body: string, url?: string) {
  // Se o browser suporta a Notification API e a permissão já foi concedida,
  // mostramos uma notificação nativa mesmo com o app aberto.
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
    if (url) n.onclick = () => window.focus() || window.location.assign(url)
    return
  }

  // Fallback: alert simples (substitua por sonner/react-hot-toast se quiser)
  console.info(`[FCM Foreground] ${title}: ${body}`)
}

export function useFCM() {
  const { user } = useSimpleAuth()
  const registeredUid = useRef<string | null>(null)

  // ── Registra / remove token conforme o estado de auth ────────────────────
  useEffect(() => {
    if (user?.id && registeredUid.current !== user.id) {
      registeredUid.current = user.id
      registerFCMToken(user.id)
    }

    if (!user && registeredUid.current) {
      unregisterFCMToken(registeredUid.current)
      registeredUid.current = null
    }
  }, [user?.id])

  // ── Escuta mensagens com o app aberto (foreground) ───────────────────────
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'Servicoflix'
      const body  = payload.notification?.body  || 'Nova notificação'
      const url   = payload.data?.url as string | undefined
      showToast(title, body, url)
    })

    return () => unsubscribe()
  }, [user?.id])
}
