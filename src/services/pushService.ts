import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface PushPayload {
  title?: string;
  body?: string;
  emergencyId?: string;
  emergency_id?: string;
  type?: string;
}

// v2 channel: Android channels are immutable once created, so a new id is
// required to switch the sound to the custom MP3 (res/raw/dispatch_tone.mp3).
const CHANNEL_ID = 'emergency_alerts_v2';
const LEGACY_CHANNEL_IDS = ['emergency_alerts'];
const CHANNEL_SOUND = 'dispatch_tone';
let channelCreated = false;
let listenersSetup = false;
let registrationListenersSetup = false;
let registrationInFlight: Promise<string | null> | null = null;
let registrationTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRegistrationResolve: ((value: string | null) => void) | null = null;
let pendingRegistrationSilent = false;
let lastRegisteredToken: string | null = null;

function finishRegistration(value: string | null) {
  if (registrationTimeout) {
    clearTimeout(registrationTimeout);
    registrationTimeout = null;
  }

  const resolve = pendingRegistrationResolve;
  pendingRegistrationResolve = null;
  pendingRegistrationSilent = false;
  registrationInFlight = null;
  resolve?.(value);
}

/* ── Android notification channel ── */

async function ensureNotificationChannel(): Promise<void> {
  if (channelCreated || Capacitor.getPlatform() !== 'android') return;
  try {
    // Delete and recreate to pick up config changes
    try { await LocalNotifications.deleteChannel({ id: CHANNEL_ID }); } catch (_) {}

    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Emergencias',
      description: 'Alertas de emergencia con sonido y vibración',
      importance: 5,       // IMPORTANCE_HIGH = heads-up
      visibility: 1,       // PUBLIC
      sound: 'default',
      vibration: true,
      lights: true,
    });
    channelCreated = true;
    console.log(`[Push] Channel "${CHANNEL_ID}" created (importance=5/max)`);
  } catch (err: any) {
    console.error('[Push] Channel creation error:', err);
  }
}

/* ── Save FCM token ── */

async function saveTokenToSupabase(token: string, platform: string): Promise<boolean> {
  console.log('[Push] Saving token…');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Push] No user session; token not saved');
      return false;
    }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      console.warn('[Push] No org membership; token not saved');
      return false;
    }

    // Limpia tokens viejos del mismo usuario+plataforma para evitar zombies
    const { error: delError } = await (supabase as any)
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform)
      .neq('token', token);
    if (delError) console.warn('[Push] Could not clean stale tokens:', delError.message);

    const { error } = await (supabase as any)
      .from('device_tokens')
      .upsert({
        user_id: user.id,
        organization_id: membership.organization_id,
        token,
        platform,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });

    if (error) {
      console.error('[Push] DB error saving token:', error.message);
      return false;
    }

    console.log(`[Push] Token saved OK for user=${user.id} org=${membership.organization_id}`);
    return true;
  } catch (err: any) {
    console.error('[Push] saveToken exception:', err?.message || err);
    return false;
  }
}

function setupRegistrationListeners(): void {
  if (!Capacitor.isNativePlatform() || registrationListenersSetup) return;
  registrationListenersSetup = true;

  PushNotifications.addListener('registration', async (tokenData) => {
    lastRegisteredToken = tokenData.value;
    console.log(`[Push] Token: ${tokenData.value.slice(0, 20)}…`);

    const saved = await saveTokenToSupabase(tokenData.value, Capacitor.getPlatform());
    if (saved && !pendingRegistrationSilent) {
      toast.success('Notificaciones activadas');
    }

    finishRegistration(tokenData.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err);
    if (!pendingRegistrationSilent) {
      toast.error('Error al registrar notificaciones');
    }
    finishRegistration(null);
  });
}

/* ── Registration ── */

export async function registerForPushNotifications(options: { force?: boolean; silent?: boolean } = {}): Promise<string | null> {
  const { force = false, silent = false } = options;
  console.log(`[Push] Init start force=${force} silent=${silent}`);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log(`[Push] platform=${platform} native=${isNative}`);
  if (!isNative) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    console.warn('[Push] Skipping registration: no authenticated session yet');
    return null;
  }

  await ensureNotificationChannel();

  // Request local notification permissions (needed for foreground)
  try {
    const localPerm = await LocalNotifications.requestPermissions();
    console.log(`[Push] Local notification permission: ${localPerm.display}`);
  } catch (e) {
    console.warn('[Push] Local notification permission request failed:', e);
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn(`[Push] Permission denied: ${permStatus.receive}`);
      if (!silent) {
        toast.error('Permisos de notificación denegados');
      }
      return null;
    }
    console.log('[Push] Permissions granted');

    setupRegistrationListeners();

    if (!force && lastRegisteredToken) {
      console.log('[Push] Reusing token already obtained in this session');
      await saveTokenToSupabase(lastRegisteredToken, platform);
      return lastRegisteredToken;
    }

    if (registrationInFlight) return registrationInFlight;

    pendingRegistrationSilent = silent;
    registrationInFlight = new Promise<string | null>((resolve) => {
      pendingRegistrationResolve = resolve;
      registrationTimeout = setTimeout(() => {
        console.warn('[Push] Token timeout 15s');
        finishRegistration(lastRegisteredToken);
      }, 15000);
    });

    await PushNotifications.register();
    return await registrationInFlight;
  } catch (err: any) {
    console.error('[Push] Exception:', err?.message || err);
    finishRegistration(null);
    return null;
  }
}

/* ── Notification opened tracking ── */

async function markNotificationOpened(emergencyId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !emergencyId) return;

    const { error } = await (supabase as any)
      .from('notification_log')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('emergency_id', emergencyId)
      .eq('status', 'sent');

    if (error) console.error('[Push] Failed to mark opened:', error.message);
    else console.log(`[Push] Marked opened: ${emergencyId}`);
  } catch (err: any) {
    console.error('[Push] markOpened exception:', err?.message || err);
  }
}

/* ── Local notification for foreground ── */

async function showLocalNotification(title: string, body: string, data: Record<string, string>): Promise<void> {
  try {
    console.log(`[Push] Firing local notification channel=${CHANNEL_ID}`);
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Math.floor(Math.random() * 2147483647), // Random int32 to avoid collisions
        channelId: CHANNEL_ID,
        extra: data,
        smallIcon: 'ic_notification', // White silhouette for status bar
        largeIcon: 'ic_launcher',
        sound: 'default',
      }],
    });
    console.log('[Push] Local notification scheduled OK');
  } catch (err: any) {
    console.error('[Push] Local notification error:', err);
  }
}

/* ── Push listeners ── */

export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform() || listenersSetup) return;
  listenersSetup = true;
  console.log('[Push] Setting up listeners');

  // Foreground: FCM delivers data but no banner → show local notification
  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    console.log('[Push] FOREGROUND received:', JSON.stringify(notification));
    const payload = (notification.data ?? {}) as PushPayload;
    const title = notification.title || payload.title || 'Nueva emergencia';
    const body = notification.body || payload.body || '';
    const emergencyId = payload.emergencyId || payload.emergency_id || '';

    await showLocalNotification(title, body, {
      type: payload.type || 'new_emergency',
      emergencyId,
    });
  });

  // Background/closed: user tapped the system notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Push tap:', JSON.stringify(action));
    const payload = action.notification.data as PushPayload;
    const emergencyId = payload?.emergencyId || payload?.emergency_id || '';
    if (emergencyId) {
      markNotificationOpened(emergencyId);
      navigate(`/mobile/emergency/${emergencyId}`);
    }
  });

  // Foreground local notification tap
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('[Push] Local tap:', JSON.stringify(action));
    const extra = action.notification.extra as PushPayload | undefined;
    const emergencyId = extra?.emergencyId || extra?.emergency_id || '';
    if (emergencyId) {
      markNotificationOpened(emergencyId);
      navigate(`/mobile/emergency/${emergencyId}`);
    }
  });
}

export function removePushListeners(): void {
  if (!Capacitor.isNativePlatform()) return;
  PushNotifications.removeAllListeners();
  LocalNotifications.removeAllListeners();
  listenersSetup = false;
  registrationListenersSetup = false;
  finishRegistration(null);
}

/* ── Helpers ── */

export function simulatePushNotification(navigate: NavigateFunction, emergencyId: string): void {
  toast.info('Simulación: Nueva emergencia', {
    description: `Emergencia ${emergencyId.slice(0, 8)}... recibida`,
    action: { label: 'Ver detalle', onClick: () => navigate(`/mobile/emergency/${emergencyId}`) },
    duration: 6000,
  });
}

export async function sendPushToOrganization(
  organizationId: string, emergencyId: string, title: string, body: string
): Promise<void> {
  const payload = { organization_id: organizationId, emergency_id: emergencyId, title, body, type: 'new_emergency' };
  console.log('[Push] Invoking edge function:', JSON.stringify(payload));
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', { body: payload });
    if (error) console.error('[Push] Edge fn error:', error);
    else console.log('[Push] Edge fn response:', JSON.stringify(data));
  } catch (err: any) {
    console.error('[Push] Exception:', err?.message || err);
  }
}
