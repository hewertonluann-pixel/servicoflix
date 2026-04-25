// Service Worker para Firebase Cloud Messaging (background notifications)
// Config hardcoded — o SW não tem acesso às variáveis de ambiente do Vite.
// O fcm.ts usa navigator.serviceWorker.ready para garantir que este SW
// está ativo antes de chamar getToken(), evitando tokens inválidos no mobile.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBcMChkC1ZqVy6hhvDpvVBT3mTH-f17zd4",
  authDomain: "prontto-60341.firebaseapp.com",
  projectId: "prontto-60341",
  storageBucket: "prontto-60341.appspot.com",
  messagingSenderId: "788762949792",
  appId: "1:788762949792:web:842ae1dac6f1b8229571c5",
});

const messaging = firebase.messaging();

// Exibe a notificação quando o app está em background ou fechado.
// O backend envia apenas data payload (sem bloco notification),
// por isso o SW é o único responsável por exibir a notificação visual.
// Isso elimina a duplicidade causada pela exibição automática do FCM.
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, url } = payload.data || {};

  // Extrai o chatId da URL para usar como tag (evita empilhar cópias do mesmo chat)
  const chatId = url ? (url.split('/chat/')[1] || 'geral') : 'geral';

  self.registration.showNotification(title || 'Servicoflix', {
    body: body || 'Você tem uma nova notificação.',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: `chat-${chatId}`,
    renotify: false,
    data: { url: url || '/' },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  });
});

// Ao clicar na notificação, abre ou foca a aba do app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
