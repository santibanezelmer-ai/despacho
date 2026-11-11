import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const NATIVE_AUTH_SESSION_KEY = 'operix.native.auth.session';

function isNativeAuthStorageEnabled() {
  return Capacitor.isNativePlatform();
}

export async function persistNativeAuthSession(session: Session | null): Promise<void> {
  if (!isNativeAuthStorageEnabled()) return;

  if (!session?.access_token || !session?.refresh_token) {
    await Preferences.remove({ key: NATIVE_AUTH_SESSION_KEY });
    return;
  }

  await Preferences.set({
    key: NATIVE_AUTH_SESSION_KEY,
    value: JSON.stringify(session),
  });
}

export async function clearNativeAuthSession(): Promise<void> {
  if (!isNativeAuthStorageEnabled()) return;
  await Preferences.remove({ key: NATIVE_AUTH_SESSION_KEY });
}

export type AuthRestoreResult = {
  state: 'AUTHENTICATED' | 'PENDING_VALIDATION' | 'UNAUTHENTICATED';
  session: Session | null;
};

export async function restoreNativeAuthSession(): Promise<AuthRestoreResult> {
  if (!isNativeAuthStorageEnabled()) return { state: 'UNAUTHENTICATED', session: null };

  const { value } = await Preferences.get({ key: NATIVE_AUTH_SESSION_KEY });
  if (!value) return { state: 'UNAUTHENTICATED', session: null };

  try {
    const savedSession = JSON.parse(value) as Session | null;
    if (!savedSession?.access_token || !savedSession?.refresh_token) {
      await clearNativeAuthSession();
      return { state: 'UNAUTHENTICATED', session: null };
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.refresh_token === savedSession.refresh_token) {
      return { state: 'AUTHENTICATED', session: currentSession };
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: savedSession.access_token,
      refresh_token: savedSession.refresh_token,
    });

    if (error) {
      const status = (error as any).status as number | undefined;
      const isNetworkError = error.message.includes('fetch') || error.message.includes('network');

      const isRevoked = status === 400 || status === 401 || status === 403 ||
        /invalid|revoked|expired|not found/i.test(error.message ?? '');

      if (isNetworkError || !isRevoked) {
        console.warn('[Auth] Native session restore failed due to network. Pending validation.');
        return { state: 'PENDING_VALIDATION', session: savedSession };
      } else {
        console.warn('[Auth] Native session backup discarded (token genuinely revoked/invalid)', error.message);
        await clearNativeAuthSession();
        return { state: 'UNAUTHENTICATED', session: null };
      }
    }

    console.log('[Auth] Native session restored successfully via setSession');
    return { state: 'AUTHENTICATED', session: data.session };
  } catch (error) {
    console.warn('[Auth] Native session payload invalid/corrupt:', error);
    await clearNativeAuthSession();
    return { state: 'UNAUTHENTICATED', session: null };
  }
}