// Service Worker para Firebase Cloud Messaging (background notifications)
// Versão: usa Firebase compat para compatibilidade com SW

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// A config será injetada pelo frontend via postMessage ou definida aqui
// Se usar variáveis de ambiente no SW, use o vite-plugin-pwa com injectManifest
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon } = payload.notification || {};
      self.registration.showNotification(title || 'Servicoflix', {
        body: body || 'Você tem uma nova notificação.',
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data || {},
        actions: [
          { action: 'open', title: 'Abrir' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      });
    });
  }
});

// Clique na notificação: abre o app na rota correta
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
