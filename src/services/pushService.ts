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

/**
 * Save or update the device token in Supabase.
 */
async function saveTokenToSupabase(token: string, platform: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Push] No authenticated user — cannot save token');
      return;
    }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      console.warn('[Push] User has no active organization — cannot save token');
      return;
    }

    const { error } = await (supabase as any)
      .from('device_tokens')
      .upsert(
        {
          user_id: user.id,
          organization_id: membership.organization_id,
          token,
          platform,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (error) {
      console.error('[Push] Error saving token to DB:', error);
    } else {
      console.log('[Push] ✓ Token saved to device_tokens:', token.slice(0, 12) + '...');
    }
  } catch (err) {
    console.error('[Push] Error in saveTokenToSupabase:', err);
  }
}

/**
 * Request push notification permissions and register the device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not a native platform — skipping registration');
    return null;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[Push] Permission status:', permStatus.receive);

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      toast.error('Permisos de notificación denegados');
      console.warn('[Push] Permission denied');
      return null;
    }

    await PushNotifications.register();
    console.log('[Push] Registration requested...');

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (tokenData) => {
        console.log('[Push] ✓ FCM Token received:', tokenData.value.slice(0, 12) + '...');
        const platform = Capacitor.getPlatform();
        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] ✗ Registration error:', JSON.stringify(err));
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });
  } catch (err) {
    console.error('[Push] Error during registration:', err);
    return null;
  }
}

/**
 * Set up listeners for incoming push notifications.
 */
export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform()) return;

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
