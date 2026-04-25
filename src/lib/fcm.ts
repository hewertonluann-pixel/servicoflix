/**
 * fcm.ts — Gerenciamento de token FCM no frontend
 * Registra o token do dispositivo no Firestore ao fazer login.
 * Limpa o token ao fazer logout.
 *
 * CORREÇÃO: usa navigator.serviceWorker.ready (garante SW ativo)
 * e remove o postMessage desnecessário — o SW já tem a config hardcoded.
 */
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import app from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Inicializa o Service Worker e aguarda ele estar ATIVO antes de continuar.
 * navigator.serviceWorker.ready só resolve quando há um SW em estado 'activated'.
 * Isso evita o bug onde registration.active era null no mobile.
 */
async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  // Registra o SW (no-op se já estiver registrado)
  await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // Aguarda o SW estar completamente ativo — garante registration.active !== null
  const registration = await navigator.serviceWorker.ready;

  return registration;
}

/**
 * Solicita permissão de notificação e salva o token FCM no Firestore.
 * Deve ser chamado logo após o login do prestador.
 */
export async function registerFCMToken(userId: string): Promise<void> {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] Notificações não suportadas neste navegador.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Permissão de notificação negada pelo usuário.');
      return;
    }

    const registration = await initServiceWorker();
    if (!registration) return;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
      });
      console.info('[FCM] Token registrado com sucesso.');
    }
  } catch (error) {
    console.error('[FCM] Erro ao registrar token:', error);
  }
}

/**
 * Remove o token FCM do Firestore ao fazer logout.
 */
export async function unregisterFCMToken(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: null,
      fcmTokenUpdatedAt: new Date(),
    });
    console.info('[FCM] Token removido.');
  } catch (error) {
    console.error('[FCM] Erro ao remover token:', error);
  }
}

/**
 * Escuta notificações em foreground (app aberto).
 * Retorna função para cancelar o listener.
 */
export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
