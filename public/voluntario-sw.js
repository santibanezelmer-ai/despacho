// Operix Voluntario — combined Service Worker
// Scope: /voluntario
// Roles:
//   1. PWA installability (minimal cache, network-first navigations)
//   2. Firebase Cloud Messaging background notifications with CUSTOM tone
//      (data-only payload → SW controls the notification and asks any open
//      client to play the volunteer's configured dispatch tone).
//
// Platform limits (Chrome/Android): a Service Worker CANNOT play audio, and
// the browser ignores the Notification `sound` field. So a truly custom tone
// only plays when a Voluntario client is alive to receive postMessage. If no
// client exists, we fall back to a non-silent notification so the user at
// least hears the browser/OS sound, and we pass ?playTone=1 on click so the
// custom MP3 plays immediately when the app opens.

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

async function getVoluntarioClients() {
  try {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return all.filter((c) => c.url.includes('/voluntario'));
  } catch {
    return [];
  }
}

async function askClientsToPlayTone(payload, clientsArr) {
  for (const c of clientsArr) {
    try { c.postMessage({ type: 'operix-play-dispatch-tone', payload }); } catch { /* ignore */ }
  }
}

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(async (payload) => {
    const data = payload.data || {};
    const title = data.title || 'Nueva emergencia';
    const body = data.body || '';
    const emergencyId = data.emergency_id || data.emergencyId;

    // Always ask any live PWA client to play the custom dispatch tone.
    // Web platform limitation: a Service Worker cannot play audio itself
    // and browsers ignore Notification `sound`. So we ALWAYS keep the
    // notification non-silent (system sound guaranteed on lock screen /
    // closed app) AND we message live clients so the custom MP3 also
    // plays on top when the PWA is alive. On tap, ?playTone=1 fires the
    // custom MP3 as soon as the app opens.
    const clientsArr = await getVoluntarioClients();
    await askClientsToPlayTone({ title, body, emergency_id: emergencyId }, clientsArr);

    self.registration.showNotification(title, {
      body,
      icon: '/voluntario-icon-512.png',
      badge: '/voluntario-icon-512.png',
      vibrate: [400, 200, 400, 200, 400],
      tag: emergencyId ? `emg-${emergencyId}` : 'operix-vol',
      requireInteraction: true,
      // Never silent: the system notification sound must ALWAYS play,
      // over any other notification, whether the PWA is open, closed,
      // backgrounded, or the device is locked.
      silent: false,
      data: { emergency_id: emergencyId, playTone: true },
    });
  });
} catch (e) {
  console.error('[Voluntario SW] FCM init failed:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const emergencyId = event.notification.data?.emergency_id;
  const playTone = event.notification.data?.playTone ? '?playTone=1' : '';
  const target = emergencyId
    ? `/voluntario/emergencia/${emergencyId}${playTone}`
    : `/voluntario${playTone}`;
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
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Previous app-shell versions cached compiled bundles that referenced the
    // retired Carto layer. This worker intentionally does not cache the shell;
    // remove only Operix/Workbox app caches and leave messaging data alone.
    const cacheNames = await caches.keys();
    const staleAppCaches = cacheNames.filter((name) =>
      /(^|-)precache-v\d+-|(^|-)runtime-/.test(name) || name === 'supabase-api'
    );
    await Promise.allSettled(staleAppCaches.map((name) => caches.delete(name)));
    await self.clients.claim();

    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsArr) {
      if (client.url.includes('/voluntario')) {
        try { client.postMessage({ type: 'operix-pwa-updated' }); } catch { /* ignore */ }
      }
    }
  })());
});
