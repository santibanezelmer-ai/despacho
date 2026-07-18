// Operix Voluntario — combined Service Worker
// Scope: /voluntario
// Roles:
//   1. PWA installability (minimal cache, network-first navigations)
//   2. Firebase Cloud Messaging background notifications with CUSTOM tone
//      (data-only payload → SW controls the notification and asks any open
//      client to play the volunteer's configured dispatch tone, so the
//      device's default notification sound never plays over ours).

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAXYx-peJdXuuGd_byQvtWJqLRYuJ7ZAKk',
  authDomain: 'operix-dispatch.firebaseapp.com',
  projectId: 'operix-dispatch',
  storageBucket: 'operix-dispatch.firebasestorage.app',
  messagingSenderId: '153774218499',
  appId: '1:153774218499:web:60b0c200ec2e5957a61d36',
};

async function askClientsToPlayTone(payload) {
  try {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsArr) {
      if (c.url.includes('/voluntario')) {
        c.postMessage({ type: 'operix-play-dispatch-tone', payload });
      }
    }
  } catch (_) { /* ignore */ }
}

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  // Fires ONLY for data-only messages (which is what the edge function sends
  // to web tokens). Full control over display + custom tone playback.
  messaging.onBackgroundMessage(async (payload) => {
    const data = payload.data || {};
    const title = data.title || 'Nueva emergencia';
    const body = data.body || '';
    const emergencyId = data.emergency_id || data.emergencyId;

    // Ask any open Voluntario client to play the user's dispatch tone.
    await askClientsToPlayTone({ title, body, emergency_id: emergencyId });

    // silent:true → suppress the OS/browser default notification sound so
    // our custom tone (played by the client) is the ONLY audio the user hears.
    self.registration.showNotification(title, {
      body,
      icon: '/voluntario-icon-512.png',
      badge: '/voluntario-icon-512.png',
      vibrate: [400, 200, 400, 200, 400],
      tag: emergencyId ? `emg-${emergencyId}` : 'operix-vol',
      requireInteraction: true,
      silent: true,
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
