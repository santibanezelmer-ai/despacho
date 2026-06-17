// FCM Web Push integration for Operix Voluntario
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const firebaseConfig = {
  apiKey: 'WnlBXg-R1gEVhJpLFsaEXeFLhDZym-XY2JMzO44q0f8',
  authDomain: 'operix-dispatch.firebaseapp.com',
  projectId: 'operix-dispatch',
  storageBucket: 'operix-dispatch.firebasestorage.app',
  messagingSenderId: '153774218499',
  appId: '1:153774218499:android:5295e50178f48686a61d36',
};

const VAPID_KEY = 'BMQbEtdZaI13l21Czf-WTTDGUGb3JfDdHi_5kUTQG_-ZcwjFYr4ucBZpKzQM5NgHCzb8Yk1yMgsROwpIJChKjlQ';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('Notification' in window)) return false;
  if (!('PushManager' in window)) return false;
  return true;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/voluntario-sw.js', { scope: '/voluntario' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error('[FCM Web] SW register failed', e);
    return null;
  }
}

function getMessagingInstance(): Messaging | null {
  if (!isSupported()) return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.appId || !VAPID_KEY) {
    console.warn('[FCM Web] Missing Firebase web config or VAPID key. Push disabled.');
    return null;
  }
  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function registerVolunteerPush(organizationId: string, userId: string): Promise<string | null> {
  const m = getMessagingInstance();
  if (!m || !VAPID_KEY) return null;

  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return null;

  const swReg = await ensureServiceWorker();
  if (!swReg) return null;

  try {
    const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return null;

    await (supabase as any).from('device_tokens').upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        token,
        platform: 'web',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    return token;
  } catch (e) {
    console.error('[FCM Web] getToken failed', e);
    return null;
  }
}

export function listenForeground(handler: (payload: { title?: string; body?: string; emergency_id?: string }) => void) {
  const m = getMessagingInstance();
  if (!m) return () => {};
  const unsub = onMessage(m, (payload) => {
    handler({
      title: payload.notification?.title || (payload.data as any)?.title,
      body: payload.notification?.body || (payload.data as any)?.body,
      emergency_id: (payload.data as any)?.emergency_id || (payload.data as any)?.emergencyId,
    });
  });
  return unsub;
}

export function isPushSupported() {
  return isSupported() && !!VAPID_KEY && !!firebaseConfig.apiKey && !!firebaseConfig.appId;
}
