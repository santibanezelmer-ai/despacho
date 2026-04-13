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
    if (initialized.current) {
      alert('[Push][Hook] already initialized — skipping');
      return;
    }
    initialized.current = true;

    const isNative = Capacitor.isNativePlatform();
    alert(`[Push][Hook] mounted | isNative: ${isNative}`);

    if (!isNative) {
      alert('[Push][Hook] NOT native — skipping push setup');
      return;
    }

    alert('[Push][Hook] calling registerForPushNotifications…');
    registerForPushNotifications();
    setupPushListeners(navigate);

    return () => {
      removePushListeners();
      initialized.current = false;
    };
  }, [navigate]);
}
