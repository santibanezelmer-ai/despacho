import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';

export interface PushPayload {
  title?: string;
  body?: string;
  emergencyId?: string;
  type?: string;
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
      PushNotifications.addListener('registration', (token) => {
        console.log('[Push] Token:', token.value);
        toast.success('Notificaciones activadas');
        resolve(token.value);
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
 * - Foreground: shows a toast
 * - Action (tap): navigates to emergency detail if emergencyId present
 */
export function setupPushListeners(navigate: NavigateFunction): void {
  if (!Capacitor.isNativePlatform()) return;

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received:', notification);
    const payload = notification.data as PushPayload;
    toast.info(notification.title || payload.title || 'Nueva notificación', {
      description: notification.body || payload.body,
    });
  });

  // User tapped on a notification
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
 * Navigates directly to the emergency detail.
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
