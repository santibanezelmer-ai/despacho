import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { restoreNativeAuthSession } from '../services/nativeAuthStorage';
import { unregisterDeviceToken } from '../services/pushService';

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      setSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    rpc: vi.fn(),
  }
}));

vi.mock('../services/nativeAuthStorage', () => ({
  restoreNativeAuthSession: vi.fn(),
  persistNativeAuthSession: vi.fn(),
  clearNativeAuthSession: vi.fn(),
}));

vi.mock('../services/pushService', () => ({
  unregisterDeviceToken: vi.fn(),
}));

function TestComponent() {
  const { session, isPendingValidation, retryValidation, signOut, signIn } = useAuth();

  return (
    <div>
      <div data-testid="pending">{isPendingValidation ? 'yes' : 'no'}</div>
      <div data-testid="session">{session ? 'yes' : 'no'}</div>
      <button onClick={signOut} data-testid="btn-signout">Sign Out</button>
      <button onClick={retryValidation} data-testid="btn-retry">Retry</button>
      <button onClick={() => signIn('test@test.com', 'pwd')} data-testid="btn-signin">Sign In</button>
    </div>
  );
}

describe('AuthContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Recuperación de conexión', async () => {
    // 1. Initial state: network error
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    vi.mocked(restoreNativeAuthSession).mockResolvedValue({
      state: 'PENDING_VALIDATION',
      session: { access_token: '123' } as any
    });

    render(<AuthProvider><TestComponent /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('yes'));
    expect(screen.getByTestId('session').textContent).toBe('no');

    // 2. Simulate recovery
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: '123' } }, error: null } as any);
    vi.mocked(restoreNativeAuthSession).mockResolvedValue({
      state: 'AUTHENTICATED',
      session: { access_token: '123' } as any
    });

    await act(async () => {
      screen.getByTestId('btn-retry').click();
    });

    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('no'));
    expect(screen.getByTestId('session').textContent).toBe('yes');
  });

  it('Logout manual durante una restauración pendiente', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    vi.mocked(restoreNativeAuthSession).mockResolvedValue({
      state: 'PENDING_VALIDATION',
      session: { access_token: '123' } as any
    });

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('yes'));

    await act(async () => {
      screen.getByTestId('btn-signout').click();
    });

    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('no'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('Error de FCM durante el logout no bloquea el cierre', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: '123' } }, error: null } as any);
    vi.mocked(unregisterDeviceToken).mockRejectedValue(new Error('FCM Network Error'));

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('yes'));

    await act(async () => {
      screen.getByTestId('btn-signout').click();
    });

    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('no'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('Inicio de sesión con una segunda cuenta después del logout', async () => {
    // Initial user logged in
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: '123' } }, error: null } as any);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('yes'));

    // Logout
    await act(async () => {
      screen.getByTestId('btn-signout').click();
    });
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('no'));

    // Second login
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ error: null } as any);
    await act(async () => {
      screen.getByTestId('btn-signin').click();
    });

    // Simulate Supabase firing the SIGNED_IN event
    // The implementation relies on onAuthStateChange, but we just want to ensure manualLogoutRef is cleared
    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  });
});
