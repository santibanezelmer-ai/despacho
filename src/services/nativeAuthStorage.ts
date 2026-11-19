import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Native (Android/iOS) durable backup of the auth session.
 *
 * The auth client itself is auto-generated and keeps its live session in the
 * WebView localStorage, which Android/iOS may wipe. This module keeps ONE
 * durable mirror in Capacitor Preferences with these guarantees:
 *  - Single writer queue: writes are serialized and a write never replaces a
 *    newer session with an older one (late writes are dropped).
 *  - Single restore in flight: concurrent callers share one promise, so the
 *    same refresh token is never sent twice at the same time.
 *  - The backup is only destroyed on a confirmed manual logout or a definitive
 *    server-side revocation — never on network/temporary/conflict errors.
 */

const NATIVE_AUTH_SESSION_KEY = 'operix.native.auth.session';

export function isNativeAuthStorageEnabled() {
  return Capacitor.isNativePlatform();
}

// ---------- serialized writes ----------
let writeChain: Promise<void> = Promise.resolve();
let writeSeq = 0;
let lastWritten: { refresh: string; expiresAt: number } | null = null;

function expiresAtOf(s: Session): number {
  return typeof s.expires_at === 'number' ? s.expires_at : 0;
}

export function persistNativeAuthSession(session: Session | null): Promise<void> {
  if (!isNativeAuthStorageEnabled()) return Promise.resolve();
  if (!session?.access_token || !session?.refresh_token) return Promise.resolve(); // never clears implicitly

  const seq = ++writeSeq;
  writeChain = writeChain.then(async () => {
    if (seq !== writeSeq) return; // a newer write is queued; drop this stale one
    if (
      lastWritten &&
      lastWritten.refresh !== session.refresh_token &&
      expiresAtOf(session) < lastWritten.expiresAt
    ) {
      return; // older token arriving late must not overwrite a newer one
    }
    await Preferences.set({ key: NATIVE_AUTH_SESSION_KEY, value: JSON.stringify(session) });
    lastWritten = { refresh: session.refresh_token, expiresAt: expiresAtOf(session) };
  }).catch((e) => console.warn('[Auth] native backup write failed', e));
  return writeChain;
}

/** Only call on a confirmed manual logout or a definitive revocation. */
export function clearNativeAuthSession(): Promise<void> {
  if (!isNativeAuthStorageEnabled()) return Promise.resolve();
  ++writeSeq; // invalidate queued writes
  writeChain = writeChain.then(async () => {
    await Preferences.remove({ key: NATIVE_AUTH_SESSION_KEY });
    lastWritten = null;
  }).catch((e) => console.warn('[Auth] native backup clear failed', e));
  return writeChain;
}

// ---------- error classification ----------
export type AuthErrorKind = 'network' | 'temporary' | 'conflict' | 'revoked';

export function classifyAuthError(error: { message?: string; status?: number; code?: string } | null | undefined): AuthErrorKind {
  const msg = (error?.message ?? '').toLowerCase();
  const code = (error?.code ?? '').toLowerCase();
  const status = error?.status;

  if (!status || status === 0 || /fetch|network|timeout|load failed|offline/.test(msg)) return 'network';
  if (status >= 500 || status === 429 || status === 408) return 'temporary';
  if (code === 'refresh_token_already_used' || msg.includes('already used')) return 'conflict';
  if (
    code === 'refresh_token_not_found' ||
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'user_not_found' ||
    code === 'user_banned' ||
    msg.includes('refresh token not found') ||
    msg.includes('session not found') ||
    msg.includes('session expired') ||
    msg.includes('user not found') ||
    msg.includes('banned')
  ) return 'revoked';
  // Any other 4xx is ambiguous: keep credentials and retry later.
  return 'temporary';
}

// ---------- single-flight restore ----------
export type AuthRestoreResult = {
  state: 'AUTHENTICATED' | 'PENDING_VALIDATION' | 'UNAUTHENTICATED';
  session: Session | null;
};

let restoreInFlight: Promise<AuthRestoreResult> | null = null;

export function restoreNativeAuthSession(): Promise<AuthRestoreResult> {
  if (!isNativeAuthStorageEnabled()) return Promise.resolve({ state: 'UNAUTHENTICATED', session: null });
  if (!restoreInFlight) {
    restoreInFlight = doRestore().finally(() => { restoreInFlight = null; });
  }
  return restoreInFlight;
}

async function doRestore(): Promise<AuthRestoreResult> {
  // If the client already has a session (e.g. refreshed by another path), use it.
  const { data: { session: live } } = await supabase.auth.getSession();
  if (live) return { state: 'AUTHENTICATED', session: live };

  await writeChain; // make sure we read the latest backup
  const { value } = await Preferences.get({ key: NATIVE_AUTH_SESSION_KEY });
  if (!value) return { state: 'UNAUTHENTICATED', session: null };

  let saved: Session | null = null;
  try {
    saved = JSON.parse(value) as Session | null;
  } catch {
    saved = null;
  }
  if (!saved?.access_token || !saved?.refresh_token) {
    await clearNativeAuthSession(); // corrupt payload, nothing usable
    return { state: 'UNAUTHENTICATED', session: null };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: saved.access_token,
    refresh_token: saved.refresh_token,
  });

  if (!error && data.session) {
    void persistNativeAuthSession(data.session);
    return { state: 'AUTHENTICATED', session: data.session };
  }

  const kind = classifyAuthError(error as any);
  if (kind === 'conflict') {
    // Another path rotated the token first; use its result if present.
    const { data: { session: winner } } = await supabase.auth.getSession();
    if (winner) {
      void persistNativeAuthSession(winner);
      return { state: 'AUTHENTICATED', session: winner };
    }
    console.warn('[Auth] refresh conflict without a winning session; keeping backup');
    return { state: 'PENDING_VALIDATION', session: saved };
  }
  if (kind === 'revoked') {
    console.warn('[Auth] session definitively revoked by server');
    await clearNativeAuthSession();
    return { state: 'UNAUTHENTICATED', session: null };
  }
  console.warn(`[Auth] restore deferred (${kind}); credentials kept`);
  return { state: 'PENDING_VALIDATION', session: saved };
}

/** Test helper. */
export function __resetNativeAuthStateForTests() {
  writeChain = Promise.resolve();
  writeSeq = 0;
  lastWritten = null;
  restoreInFlight = null;
}
