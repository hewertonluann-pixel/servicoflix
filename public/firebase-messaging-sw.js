// Service Worker para Firebase Cloud Messaging (background notifications)
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

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Servicoflix', {
    body: body || 'Você tem uma nova notificação.',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  });
});

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
