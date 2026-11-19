import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }));
const store = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }) => { store.set(key, value); }),
    remove: vi.fn(async ({ key }) => { store.delete(key); }),
  },
}));
vi.mock('../integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(), setSession: vi.fn() } },
}));

import { supabase } from '../integrations/supabase/client';
import {
  restoreNativeAuthSession, persistNativeAuthSession, classifyAuthError, __resetNativeAuthStateForTests,
} from '../services/nativeAuthStorage';

const KEY = 'operix.native.auth.session';
const s = (rt: string, exp: number) => ({ access_token: 'a' + rt, refresh_token: rt, expires_at: exp } as any);

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  __resetNativeAuthStateForTests();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
});

describe('native session restore safety', () => {
  it('two simultaneous restores send the refresh token only once', async () => {
    store.set(KEY, JSON.stringify(s('rt1', 100)));
    vi.mocked(supabase.auth.setSession).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { data: { session: s('rt2', 200) }, error: null } as any;
    });
    const [a, b] = await Promise.all([restoreNativeAuthSession(), restoreNativeAuthSession()]);
    expect(supabase.auth.setSession).toHaveBeenCalledTimes(1);
    expect(a.state).toBe('AUTHENTICATED');
    expect(b.session?.refresh_token).toBe('rt2');
  });

  it('network error keeps credentials', async () => {
    store.set(KEY, JSON.stringify(s('rt1', 100)));
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: { session: null }, error: { message: 'Failed to fetch', status: 0 } } as any);
    const r = await restoreNativeAuthSession();
    expect(r.state).toBe('PENDING_VALIDATION');
    expect(store.has(KEY)).toBe(true);
  });

  it('a generic HTTP 400 does not destroy credentials', async () => {
    store.set(KEY, JSON.stringify(s('rt1', 100)));
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: { session: null }, error: { message: 'Bad request', status: 400 } } as any);
    await restoreNativeAuthSession();
    expect(store.has(KEY)).toBe(true);
  });

  it('refresh conflict uses the session that won and keeps credentials', async () => {
    store.set(KEY, JSON.stringify(s('rt1', 100)));
    vi.mocked(supabase.auth.getSession)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as any)
      .mockResolvedValueOnce({ data: { session: s('rt9', 300) }, error: null } as any);
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token: Already Used', status: 400, code: 'refresh_token_already_used' } } as any);
    const r = await restoreNativeAuthSession();
    expect(r.state).toBe('AUTHENTICATED');
    expect(r.session?.refresh_token).toBe('rt9');
  });

  it('definitive revocation clears credentials', async () => {
    store.set(KEY, JSON.stringify(s('rt1', 100)));
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token: Refresh Token Not Found', status: 400, code: 'refresh_token_not_found' } } as any);
    const r = await restoreNativeAuthSession();
    expect(r.state).toBe('UNAUTHENTICATED');
    expect(store.has(KEY)).toBe(false);
  });

  it('a late write of an older token never overwrites a newer one', async () => {
    await persistNativeAuthSession(s('new', 500));
    await persistNativeAuthSession(s('old', 100));
    expect(JSON.parse(store.get(KEY)!).refresh_token).toBe('new');
  });

  it('every refreshed token is persisted', async () => {
    await persistNativeAuthSession(s('rt1', 100));
    await persistNativeAuthSession(s('rt2', 200));
    expect(JSON.parse(store.get(KEY)!).refresh_token).toBe('rt2');
  });

  it('classifies errors', () => {
    expect(classifyAuthError({ message: 'x', status: 503 })).toBe('temporary');
    expect(classifyAuthError({ message: 'Session not found', status: 403, code: 'session_not_found' })).toBe('revoked');
  });
});
