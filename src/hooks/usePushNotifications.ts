import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { registerForPushNotifications, setupPushListeners, removePushListeners } from '@/services/pushService';

/**
 * Hook that initialises push notifications for authenticated native users.
 * Should be mounted once at a top level (e.g. inside authenticated route tree).
 */
export function usePushNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const isNative = Capacitor.isNativePlatform();
    console.log('[Push] usePushNotifications mounted, isNative:', isNative);

    if (!isNative) {
      console.log('[Push] skipping push setup — not native platform');
      return;
    }

    // Register token
    registerForPushNotifications();

    // Set up foreground / tap listeners
    setupPushListeners(navigate);

    return () => {
      removePushListeners();
      initialized.current = false;
    };
  }, [navigate]);
}
