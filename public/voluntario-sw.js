// Operix Voluntario — combined Service Worker
// Scope: /voluntario
// Roles:
//   1. PWA installability (minimal cache, network-first navigations)
//   2. Firebase Cloud Messaging background notifications
//
// IMPORTANT: keep this file at /voluntario-sw.js and register with
// scope:'/voluntario' so it is the ONLY SW controlling /voluntario pages.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Public Firebase Web config — injected at build time from env (see src/services/fcmWebPush.ts).
// Hardcoded duplicate here because the SW cannot read import.meta.env.
// These values are publishable (project-id + messagingSenderId + appId).
const FIREBASE_CONFIG = {
  apiKey: 'PLACEHOLDER_WEB_API_KEY',
  authDomain: 'operix-dispatch.firebaseapp.com',
  projectId: 'operix-dispatch',
  storageBucket: 'operix-dispatch.firebasestorage.app',
  messagingSenderId: '153774218499',
  appId: 'PLACEHOLDER_WEB_APP_ID',
};

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Nueva emergencia';
    const body = payload.notification?.body || payload.data?.body || '';
    const emergencyId = payload.data?.emergency_id || payload.data?.emergencyId;
    self.registration.showNotification(title, {
      body,
      icon: '/voluntario-icon-512.png',
      badge: '/voluntario-icon-512.png',
      vibrate: [400, 200, 400, 200, 400],
      tag: emergencyId ? `emg-${emergencyId}` : 'operix-vol',
      requireInteraction: true,
      data: { emergency_id: emergencyId },
    });
  });
} catch (e) {
  console.error('[Voluntario SW] FCM init failed:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const emergencyId = event.notification.data?.emergency_id;
  const target = emergencyId ? `/voluntario/emergencia/${emergencyId}` : '/voluntario';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes('/voluntario') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
