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
    if (!user) return;

    // Get user's active organization
    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) return;

    // Upsert token (on conflict by token uniqueness)
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
      console.error('[Push] Error saving token:', error);
    } else {
      console.log('[Push] Token saved to database');
    }
  } catch (err) {
    console.error('[Push] Error saving token:', err);
  }
}

/**
 * Request push notification permissions and register the device.
 * Returns the FCM/APNs token or null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not a native platform — skipping registration');
    return null;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      toast.error('Permisos de notificación denegados');
      console.warn('[Push] Permission denied');
      return null;
    }

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (tokenData) => {
        console.log('[Push] Token:', tokenData.value);
        const platform = Capacitor.getPlatform(); // 'android' | 'ios'
        await saveTokenToSupabase(tokenData.value, platform);
        toast.success('Notificaciones activadas');
        resolve(tokenData.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err);
        toast.error('Error al registrar notificaciones');
        resolve(null);
      });
    });
  } catch (err) {
    console.error('[Push] Error:', err);
    return null;
  }
}

/**
 * Set up listeners for incoming push notifications.
 */
export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform()) return;

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received:', notification);
    const payload = notification.data as PushPayload;
    toast.info(notification.title || payload.title || 'Nueva notificación', {
      description: notification.body || payload.body,
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Action:', action);
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
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        organization_id: organizationId,
        emergency_id: emergencyId,
        title,
        body,
        type: 'new_emergency',
      },
    });
    if (error) {
      console.error('[Push] Error sending push:', error);
    } else {
      console.log('[Push] Push notifications sent');
    }
  } catch (err) {
    console.error('[Push] Error invoking push function:', err);
  }
}
