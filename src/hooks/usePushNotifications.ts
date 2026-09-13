import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { registerForPushNotifications, setupPushListeners } from '@/services/pushService';
import { restoreNativeAuthSession } from '@/services/nativeAuthStorage';

export function usePushNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!Capacitor.isNativePlatform()) return;

    console.log('[Push][Hook] initializing push notifications');
    void setupPushListeners(navigate);

    const syncRegistration = async (force = false, silent = true) => {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        session = await restoreNativeAuthSession();
      }
      if (!session?.user) return;
      await registerForPushNotifications({ force, silent });
    };

    syncRegistration(false, false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) void syncRegistration(false, true);
      }
    });

    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void syncRegistration(true, true);
    });

    return () => {
      subscription.unsubscribe();
      void appStateListener.then((listener) => listener.remove());
      // NOTE: we intentionally do NOT call removePushListeners() here.
      // The push/registration listeners are process-lifetime singletons;
      // removing them on unmount (or on a React re-mount) races with an
      // in-flight PushNotifications.register() and loses the FCM token event.
      initialized.current = false;
    };
  }, [navigate]);
}
