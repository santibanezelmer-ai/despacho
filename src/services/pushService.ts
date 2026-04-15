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

async function ensureNotificationChannel(): Promise<void> {
  if (channelCreated || Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Emergencias',
      description: 'Alertas de emergencia con sonido y vibración',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lights: true,
    });
    channelCreated = true;
    console.log(`[Push] ✓ Android channel "${CHANNEL_ID}" created (importance=max)`);
  } catch (err: any) {
    console.error('[Push] ✗ Channel creation error:', err);
  }
}

async function saveTokenToSupabase(token: string, platform: string): Promise<void> {
  console.log('[Push] saving token…');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[Push] NO user session'); return; }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) { console.warn('[Push] NO org membership'); return; }

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

    if (error) console.error('[Push] DB error saving token:', error.message);
    else console.log('[Push] token saved ✓');
  } catch (err: any) {
    console.error('[Push] saveToken exception:', err?.message || err);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  console.log('[Push] init start');
  if (registrationAttempted) return null;
  registrationAttempted = true;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log(`[Push] platform: ${platform} | native: ${isNative}`);
  if (!isNative) return null;

  await ensureNotificationChannel();

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn(`[Push] permission denied: ${permStatus.receive}`);
      toast.error('Permisos de notificación denegados');
      return null;
    }
    console.log('[Push] permissions granted ✓');

    const tokenPromise = new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => { console.warn('[Push] timeout 15s'); resolve(null); }, 15000);

      PushNotifications.addListener('registration', async (tokenData) => {
        clearTimeout(timeout);
        console.log(`[Push] token received: ${tokenData.value.slice(0, 20)}…`);
        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        clearTimeout(timeout);
        console.error('[Push] registration error:', err);
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });

    await PushNotifications.register();
    return await tokenPromise;
  } catch (err: any) {
    console.error('[Push] exception:', err?.message || err);
    return null;
  }
}

async function showLocalNotification(title: string, body: string, data: Record<string, string>): Promise<void> {
  try {
    console.log('[Push] 📢 Firing local foreground notification via channel:', CHANNEL_ID);
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

export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform()) return;

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

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] 👆 Tap:', JSON.stringify(action));
    const payload = action.notification.data as PushPayload;
    if (payload.emergencyId) {
      navigate(`/mobile/emergency/${payload.emergencyId}`);
    }
  });

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
