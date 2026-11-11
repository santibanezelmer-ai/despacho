import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistNativeAuthSession, restoreNativeAuthSession, clearNativeAuthSession } from '../services/nativeAuthStorage';
import { supabase } from '../integrations/supabase/client';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true)
  }
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  }
}));

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      setSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    }
  }
}));

describe('Native Auth Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Restauración online exitosa', async () => {
    const mockSession = { access_token: '123', refresh_token: 'abc' };
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(mockSession) });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: { session: mockSession }, error: null } as any);

    const result = await restoreNativeAuthSession();
    expect(result.state).toBe('AUTHENTICATED');
    expect(result.session).toEqual(mockSession);
  });

  it('Restauración sin Internet (PENDING_VALIDATION)', async () => {
    const mockSession = { access_token: '123', refresh_token: 'abc' };
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(mockSession) });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);

    // Simulate network error
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Failed to fetch', name: 'AuthError', status: 0 } as any
    });

    const result = await restoreNativeAuthSession();
    expect(result.state).toBe('PENDING_VALIDATION');
    expect(result.session).toEqual(mockSession);
  });

  it('Token realmente inválido o revocado', async () => {
    const mockSession = { access_token: '123', refresh_token: 'abc' };
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(mockSession) });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);

    // Simulate revoked token error
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid Refresh Token: Already Used', status: 400, name: 'AuthError' } as any
    });

    const result = await restoreNativeAuthSession();
    expect(result.state).toBe('UNAUTHENTICATED');
    expect(result.session).toBeNull();
    expect(Preferences.remove).toHaveBeenCalled();
  });
});
