import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { registerForPushNotifications, setupPushListeners, ensureRegistrationListeners, flushPendingToken } from '@/services/pushService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Push registration follows the session owned by AuthContext. It never reads,
 * restores or refreshes the auth session itself, so it cannot race the
 * single restore path with the same refresh token.
 */
export function usePushNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const syncRef = useRef<(force: boolean) => Promise<void>>(async () => {});
  syncRef.current = async (force: boolean) => {
    await ensureRegistrationListeners();
    await setupPushListeners(navigate);
    if (!userIdRef.current) return;
    await flushPendingToken();
    await registerForPushNotifications({ force, silent: true });
  };

  // Register (or re-register) whenever the authenticated user changes.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void syncRef.current(false);
  }, [user?.id]);

  // Refresh registration when the app returns to the foreground.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && userIdRef.current) void syncRef.current(true);
    });
    return () => { void listener.then((l) => l.remove()); };
  }, []);
}
