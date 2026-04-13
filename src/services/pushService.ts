import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface PushPayload {
  title?: string;
  body?: string;
  emergencyId?: string;
  type?: string;
}

/** Track whether we already attempted registration this session */
let registrationAttempted = false;

/**
 * Save or update the device token in Supabase.
 */
async function saveTokenToSupabase(token: string, platform: string): Promise<void> {
  console.log('[Push] saving token to Supabase…');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Push] ✗ No authenticated user — cannot save token');
      return;
    }
    console.log('[Push] authenticated user:', user.id.slice(0, 8) + '…');

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      console.warn('[Push] ✗ User has no active organization — cannot save token');
      return;
    }
    console.log('[Push] organization_id:', membership.organization_id.slice(0, 8) + '…');

    const payload = {
      user_id: user.id,
      organization_id: membership.organization_id,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    console.log('[Push] upserting device_tokens with payload:', JSON.stringify({ ...payload, token: token.slice(0, 12) + '…' }));

    const { error } = await (supabase as any)
      .from('device_tokens')
      .upsert(payload, { onConflict: 'token' });

    if (error) {
      console.error('[Push] ✗ Error saving token to DB:', JSON.stringify(error));
    } else {
      console.log('[Push] ✓ token saved to device_tokens:', token.slice(0, 12) + '…');
    }
  } catch (err) {
    console.error('[Push] ✗ Exception in saveTokenToSupabase:', err);
  }
}

/**
 * Request push notification permissions and register the device.
 * Safe to call multiple times — only executes once per session.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  console.log('[Push] init start');

  if (registrationAttempted) {
    console.log('[Push] already attempted registration this session — skipping');
    return null;
  }
  registrationAttempted = true;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log('[Push] platform:', platform, '| isNative:', isNative);

  if (!isNative) {
    console.log('[Push] ✗ Not a native platform — skipping registration');
    return null;
  }
  console.log('[Push] ✓ native platform detected');

  try {
    // 1. Check current permissions
    console.log('[Push] checking permissions…');
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[Push] permission status:', permStatus.receive);

    // 2. Request if needed
    if (permStatus.receive === 'prompt') {
      console.log('[Push] requesting permissions…');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[Push] permission after request:', permStatus.receive);
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] ✗ Permission denied:', permStatus.receive);
      toast.error('Permisos de notificación denegados');
      return null;
    }
    console.log('[Push] ✓ permissions granted');

    // 3. Register listeners BEFORE calling register()
    console.log('[Push] adding registration listeners…');

    const tokenPromise = new Promise<string | null>((resolve) => {
      // Timeout after 15s so we don't hang forever
      const timeout = setTimeout(() => {
        console.error('[Push] ✗ registration timed out after 15s');
        resolve(null);
      }, 15000);

      PushNotifications.addListener('registration', async (tokenData) => {
        clearTimeout(timeout);
        console.log('[Push] ✓ token received:', tokenData.value.slice(0, 12) + '…');
        console.log('[Push] full token length:', tokenData.value.length);

        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        clearTimeout(timeout);
        console.error('[Push] ✗ registration error:', JSON.stringify(err));
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });

    // 4. Call register
    console.log('[Push] calling PushNotifications.register()…');
    await PushNotifications.register();
    console.log('[Push] register() called — waiting for token…');

    const token = await tokenPromise;
    console.log('[Push] registration flow complete, token:', token ? token.slice(0, 12) + '…' : 'null');
    return token;
  } catch (err) {
    console.error('[Push] ✗ Exception during registration:', err);
    return null;
  }
}

/**
 * Set up listeners for incoming push notifications.
 */
export function setupPushListeners(navigate: NavigateFunction): void {
  const isNative = Capacitor.isNativePlatform();
  console.log('[Push] setupPushListeners called, isNative:', isNative);
  if (!isNative) return;

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] 📩 Received in foreground:', JSON.stringify(notification));
    const payload = notification.data as PushPayload;
    toast.info(notification.title || payload.title || 'Nueva notificación', {
      description: notification.body || payload.body,
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] 👆 Tap action:', JSON.stringify(action));
    const payload = action.notification.data as PushPayload;
    if (payload.emergencyId) {
      navigate(`/mobile/emergency/${payload.emergencyId}`);
    }
  });
}

/**
 * Remove all push notification listeners.
 */
export function removePushListeners(): void {
  if (!Capacitor.isNativePlatform()) return;
  console.log('[Push] removing all listeners');
  PushNotifications.removeAllListeners();
}

/**
 * Simulate a local push notification for development/testing.
 */
export function simulatePushNotification(navigate: NavigateFunction, emergencyId: string): void {
  toast.info('🚨 Simulación: Nueva emergencia', {
    description: `Emergencia ${emergencyId.slice(0, 8)}... recibida`,
    action: {
      label: 'Ver detalle',
      onClick: () => navigate(`/mobile/emergency/${emergencyId}`),
    },
    duration: 6000,
  });
}

/**
 * Send push notifications to all devices in an organization via edge function.
 */
export async function sendPushToOrganization(
  organizationId: string,
  emergencyId: string,
  title: string,
  body: string
): Promise<void> {
  console.log('[Push] 📤 Sending push via edge function:', { organizationId, emergencyId, title });
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        organization_id: organizationId,
        emergency_id: emergencyId,
        title,
        body,
        type: 'new_emergency',
      },
    });
    if (error) {
      console.error('[Push] ✗ Edge function error:', error);
    } else {
      console.log('[Push] ✓ Edge function response:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('[Push] ✗ Error invoking edge function:', err);
  }
}
