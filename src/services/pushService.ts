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
  type?: string;
}

const CHANNEL_ID = 'emergency_alerts';
let registrationAttempted = false;
let channelCreated = false;

/**
 * Create the high-importance Android notification channel.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (channelCreated || Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Emergencias',
      description: 'Alertas de emergencia con sonido y vibración',
      importance: 5, // max
      visibility: 1, // public
      sound: 'default',
      vibration: true,
      lights: true,
    });
    channelCreated = true;
    console.log(`[Push] ✓ Android channel "${CHANNEL_ID}" created (importance=max)`);
    alert(`[Push] canal "${CHANNEL_ID}" creado`);
  } catch (err: any) {
    console.error('[Push] ✗ Channel creation error:', err);
  }
}

/**
 * Save or update the device token in the database.
 */
async function saveTokenToSupabase(token: string, platform: string): Promise<void> {
  alert('[Push] saving token…');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('[Push] NO user'); return; }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) { alert('[Push] NO org'); return; }

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

    if (error) alert(`[Push] DB ERROR: ${JSON.stringify(error)}`);
    else alert('[Push] token saved ✓');
  } catch (err: any) {
    alert(`[Push] saveToken EXCEPTION: ${err?.message || err}`);
  }
}

/**
 * Register for push notifications. Safe to call multiple times.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  alert('[Push] init start');
  if (registrationAttempted) return null;
  registrationAttempted = true;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  alert(`[Push] platform: ${platform} | native: ${isNative}`);
  if (!isNative) return null;

  // Create channel before registering
  await ensureNotificationChannel();

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      alert(`[Push] permission DENIED: ${permStatus.receive}`);
      toast.error('Permisos de notificación denegados');
      return null;
    }
    alert('[Push] permissions granted ✓');

    const tokenPromise = new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => { alert('[Push] timeout 15s'); resolve(null); }, 15000);

      PushNotifications.addListener('registration', async (tokenData) => {
        clearTimeout(timeout);
        alert(`[Push] token: ${tokenData.value.slice(0, 20)}…`);
        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        clearTimeout(timeout);
        alert(`[Push] reg error: ${JSON.stringify(err)}`);
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });

    await PushNotifications.register();
    return await tokenPromise;
  } catch (err: any) {
    alert(`[Push] EXCEPTION: ${err?.message || err}`);
    return null;
  }
}

/**
 * Show a local heads-up notification when the app is in the foreground.
 */
async function showLocalNotification(title: string, body: string, data: Record<string, string>): Promise<void> {
  try {
    console.log('[Push] 📢 Firing local foreground notification via channel:', CHANNEL_ID);
    alert(`[Push] foreground local notification → canal: ${CHANNEL_ID}`);

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        channelId: CHANNEL_ID,
        extra: data,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_notification',
      }],
    });
  } catch (err: any) {
    console.error('[Push] ✗ Local notification error:', err);
  }
}

/**
 * Set up listeners for incoming push notifications.
 */
export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform()) return;

  // Foreground: show a real local notification (heads-up + sound)
  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    console.log('[Push] 📩 FOREGROUND:', JSON.stringify(notification));
    const payload = (notification.data ?? {}) as PushPayload;
    const title = notification.title || payload.title || 'Nueva emergencia';
    const body = notification.body || payload.body || '';

    await showLocalNotification(title, body, {
      type: payload.type || 'new_emergency',
      emergencyId: payload.emergencyId || '',
    });
  });

  // Tap on notification (background / killed)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] 👆 Tap:', JSON.stringify(action));
    const payload = action.notification.data as PushPayload;
    if (payload.emergencyId) {
      navigate(`/mobile/emergency/${payload.emergencyId}`);
    }
  });

  // Tap on local foreground notification
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('[Push] 👆 Local tap:', JSON.stringify(action));
    const extra = action.notification.extra as PushPayload | undefined;
    if (extra?.emergencyId) {
      navigate(`/mobile/emergency/${extra.emergencyId}`);
    }
  });
}

export function removePushListeners(): void {
  if (!Capacitor.isNativePlatform()) return;
  PushNotifications.removeAllListeners();
  LocalNotifications.removeAllListeners();
}

export function simulatePushNotification(navigate: NavigateFunction, emergencyId: string): void {
  toast.info('🚨 Simulación: Nueva emergencia', {
    description: `Emergencia ${emergencyId.slice(0, 8)}... recibida`,
    action: { label: 'Ver detalle', onClick: () => navigate(`/mobile/emergency/${emergencyId}`) },
    duration: 6000,
  });
}

export async function sendPushToOrganization(
  organizationId: string, emergencyId: string, title: string, body: string
): Promise<void> {
  const payload = { organization_id: organizationId, emergency_id: emergencyId, title, body, type: 'new_emergency' };
  console.log('[Push] 📤 Invoking edge function:', JSON.stringify(payload));
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', { body: payload });
    if (error) console.error('[Push] ✗ Edge fn error:', error);
    else console.log('[Push] ✓ Edge fn response:', JSON.stringify(data));
  } catch (err: any) {
    console.error('[Push] ✗ Exception:', err?.message || err);
  }
}
