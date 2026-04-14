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
  alert('[Push] saving token to Supabase…');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('[Push] NO authenticated user — cannot save token');
      return;
    }
    alert(`[Push] user: ${user.id.slice(0, 8)}…`);

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      alert('[Push] NO active organization — cannot save token');
      return;
    }
    alert(`[Push] org: ${membership.organization_id.slice(0, 8)}…`);

    const payload = {
      user_id: user.id,
      organization_id: membership.organization_id,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('device_tokens')
      .upsert(payload, { onConflict: 'token' });

    if (error) {
      alert(`[Push] DB ERROR: ${JSON.stringify(error)}`);
    } else {
      alert('[Push] token saved ✓');
    }
  } catch (err: any) {
    alert(`[Push] saveToken EXCEPTION: ${err?.message || err}`);
  }
}

/**
 * Request push notification permissions and register the device.
 * Safe to call multiple times — only executes once per session.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  alert('[Push] init start');
  console.log('[Push] init start');

  if (registrationAttempted) {
    alert('[Push] already attempted this session — skipping');
    return null;
  }
  registrationAttempted = true;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  alert(`[Push] platform: ${platform} | isNative: ${isNative}`);

  if (!isNative) {
    alert('[Push] NOT native — skipping registration');
    return null;
  }
  alert('[Push] native platform detected');

  try {
    alert('[Push] checking permissions…');
    let permStatus = await PushNotifications.checkPermissions();
    alert(`[Push] permission status: ${permStatus.receive}`);

    if (permStatus.receive === 'prompt') {
      alert('[Push] requesting permissions…');
      permStatus = await PushNotifications.requestPermissions();
      alert(`[Push] permission after request: ${permStatus.receive}`);
    }

    if (permStatus.receive !== 'granted') {
      alert(`[Push] permission DENIED: ${permStatus.receive}`);
      toast.error('Permisos de notificación denegados');
      return null;
    }
    alert('[Push] permissions granted ✓');

    alert('[Push] adding registration listeners…');
    const tokenPromise = new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        alert('[Push] registration timed out after 15s');
        resolve(null);
      }, 15000);

      PushNotifications.addListener('registration', async (tokenData) => {
        clearTimeout(timeout);
        alert(`[Push] token received: ${tokenData.value.slice(0, 20)}…`);

        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        clearTimeout(timeout);
        alert(`[Push] registration error: ${JSON.stringify(err)}`);
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });

    alert('[Push] calling PushNotifications.register()…');
    await PushNotifications.register();
    alert('[Push] register() called — waiting for token…');

    const token = await tokenPromise;
    alert(`[Push] flow complete, token: ${token ? token.slice(0, 20) + '…' : 'null'}`);
    return token;
  } catch (err: any) {
    alert(`[Push] EXCEPTION: ${err?.message || err}`);
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
    console.log('[Push] 📩 FOREGROUND notification received:', JSON.stringify(notification));
    alert(`[Push] FOREGROUND: ${notification.title || 'sin título'}`);
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
  const payload = {
    organization_id: organizationId,
    emergency_id: emergencyId,
    title,
    body,
    type: 'new_emergency',
  };
  console.log('[Push] 📤 Invoking edge function send-push-notification');
  console.log('[Push] 📤 Payload:', JSON.stringify(payload));
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });
    if (error) {
      console.error('[Push] ✗ Edge function error:', error);
      console.error('[Push] ✗ Error name:', error.name, 'message:', error.message);
    } else {
      console.log('[Push] ✓ Edge function response:', JSON.stringify(data));
    }
  } catch (err: any) {
    console.error('[Push] ✗ Exception invoking edge function:', err?.message || err);
  }
}
