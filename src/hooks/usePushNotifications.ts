import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { registerForPushNotifications, setupPushListeners, ensureRegistrationListeners, flushPendingToken } from '@/services/pushService';
import { restoreNativeAuthSession } from '@/services/nativeAuthStorage';

export function usePushNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!Capacitor.isNativePlatform()) return;

    const syncRegistration = async (force = false, silent = true) => {
      // Registration listeners first (already started eagerly at import), then
      // the delivery listeners. Never register FCM before both are attached.
      await ensureRegistrationListeners();
      await setupPushListeners(navigate);
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        session = await restoreNativeAuthSession();
      }
      if (!session?.user) return;
      await flushPendingToken();
      await registerForPushNotifications({ force, silent });
    };


    const initializePush = async () => {
      console.log('[Push][Hook] initializing push notifications');
      await syncRegistration(false, false);
    };

    void initializePush();

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
      // Push and registration listeners are process-lifetime singletons.
      // They deliberately remain active across React unmounts and remounts.
      initialized.current = false;
    };
  }, [navigate]);
}
