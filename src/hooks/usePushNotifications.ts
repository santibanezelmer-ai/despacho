import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { registerForPushNotifications, setupPushListeners, removePushListeners } from '@/services/pushService';

export function usePushNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!Capacitor.isNativePlatform()) return;

    console.log('[Push][Hook] initializing push notifications');
    setupPushListeners(navigate);

    const syncRegistration = async (force = false, silent = true) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await registerForPushNotifications({ force, silent });
    };

    syncRegistration(false, false);

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) void syncRegistration(false, true);
      }
    });

    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void syncRegistration(true, true);
    });

    return () => {
      authSubscription.subscription.unsubscribe();
      void appStateListener.then((listener) => listener.remove());
      removePushListeners();
      initialized.current = false;
    };
  }, [navigate]);
}
