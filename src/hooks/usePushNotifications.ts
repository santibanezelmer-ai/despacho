import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { registerForPushNotifications, setupPushListeners, removePushListeners } from '@/services/pushService';

export function usePushNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!Capacitor.isNativePlatform()) return;

    console.log('[Push][Hook] initializing push notifications');
    registerForPushNotifications();
    setupPushListeners(navigate);

    return () => {
      removePushListeners();
      initialized.current = false;
    };
  }, [navigate]);
}
