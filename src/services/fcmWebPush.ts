// FCM Web Push integration for Operix Voluntario
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const firebaseConfig = {
  apiKey: 'AIzaSyAXYx-peJdXuuGd_byQvtWJqLRYuJ7ZAKk',
  authDomain: 'operix-dispatch.firebaseapp.com',
  projectId: 'operix-dispatch',
  storageBucket: 'operix-dispatch.firebasestorage.app',
  messagingSenderId: '153774218499',
  appId: '1:153774218499:web:60b0c200ec2e5957a61d36',
};

const VAPID_KEY = 'BMQbEtdZaI13l21Czf-WTTDGUGb3JfDdHi_5kUTQG_-ZcwjFYr4ucBZpKzQM5NgHCzb8Yk1yMgsROwpIJChKjlQ';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function canRegisterVolunteerWorker(): boolean {
  if (!import.meta.env.PROD) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }

  const hostname = window.location.hostname;
  return !(
    hostname.startsWith('id-preview--') ||
    hostname.startsWith('preview--') ||
    hostname === 'lovableproject.com' ||
    hostname.endsWith('.lovableproject.com') ||
    hostname === 'lovableproject-dev.com' ||
    hostname.endsWith('.lovableproject-dev.com') ||
    hostname === 'beta.lovable.dev' ||
    hostname.endsWith('.beta.lovable.dev') ||
    new URLSearchParams(window.location.search).get('sw') === 'off'
  );
}

async function unregisterVolunteerWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => new URL(registration.scope).pathname.startsWith('/voluntario'))
      .map((registration) => registration.unregister()),
  );
}

function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('Notification' in window)) return false;
  if (!('PushManager' in window)) return false;
  return true;
}

export async function ensureVolunteerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  if (!canRegisterVolunteerWorker()) {
    await unregisterVolunteerWorker();
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/voluntario-sw.js', {
      scope: '/voluntario',
      updateViaCache: 'none',
    });
    await reg.update();
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
  if (!isSupported()) {
    console.warn('[FCM Web] Not supported in this browser (missing SW / Notification / PushManager).');
    return null;
  }
  const m = getMessagingInstance();
  if (!m || !VAPID_KEY) {
    console.warn('[FCM Web] Messaging instance unavailable.');
    return null;
  }

  // The volunteer worker owns /voluntario independently from notification
  // permission. This prevents an older root app-shell worker from serving a
  // stale PWA bundle when notifications have been denied.
  const swReg = await ensureVolunteerServiceWorker();
  if (!swReg) {
    console.error('[FCM Web] Service worker registration failed.');
    return null;
  }

  const perm = await requestNotificationPermission();
  console.log('[FCM Web] Notification permission:', perm);
  if (perm !== 'granted') return null;

  try {
    const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) {
      console.error('[FCM Web] getToken returned empty. Check that a Web App is registered in Firebase Console for project operix-dispatch and that apiKey/appId are the WEB values (not Android).');
      return null;
    }
    console.log('[FCM Web] ✓ Token obtained:', token.slice(0, 25) + '…');

    const { error } = await (supabase as any).from('device_tokens').upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        token,
        platform: 'web',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
    if (error) console.error('[FCM Web] device_tokens upsert failed:', error.message);
    else console.log('[FCM Web] ✓ Token stored for user', userId);

    return token;
  } catch (e: any) {
    console.error('[FCM Web] getToken failed:', e?.message || e);
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
