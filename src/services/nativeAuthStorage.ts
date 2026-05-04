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

export async function restoreNativeAuthSession(): Promise<Session | null> {
  if (!isNativeAuthStorageEnabled()) return null;

  const { value } = await Preferences.get({ key: NATIVE_AUTH_SESSION_KEY });
  if (!value) return null;

  try {
    const savedSession = JSON.parse(value) as Session | null;
    if (!savedSession?.access_token || !savedSession?.refresh_token) {
      await clearNativeAuthSession();
      return null;
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.refresh_token === savedSession.refresh_token) {
      return currentSession;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: savedSession.access_token,
      refresh_token: savedSession.refresh_token,
    });

    if (error) {
      console.warn('[Auth] Native session restore failed:', error.message);
      return null;
    }

    console.log('[Auth] Native session restored');
    return data.session;
  } catch (error) {
    console.warn('[Auth] Native session payload invalid:', error);
    await clearNativeAuthSession();
    return null;
  }
}