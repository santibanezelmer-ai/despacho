import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoluntarioApp from '../pages/voluntario/VoluntarioApp';
import { MemoryRouter } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';

import { HelmetProvider } from 'react-helmet-async';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    loading: false,
    isPendingValidation: false,
    retryValidation: vi.fn(),
    signOut: vi.fn()
  })),
  AuthProvider: ({ children }: any) => <>{children}</>
}));

// Mock Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          setTimeout(() => {
             resolve({ data: null, error: { message: 'Failed to fetch', name: 'NetworkError' } });
          }, 0);
        })
      };
      return builder;
    })
  }
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true)
  }
}));

// Mock PWA workers
vi.mock('../services/fcmWebPush', () => ({
  ensureVolunteerServiceWorker: vi.fn().mockResolvedValue(undefined),
  listenForeground: vi.fn(() => vi.fn()),
  registerVolunteerPush: vi.fn().mockResolvedValue(undefined)
}));

describe('VoluntarioApp Offline Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Lee membresía desde caché si hay error de red', async () => {
    const cachedMembership = {
      organization_id: 'org-1',
      org_name: 'Test Org',
      org_status: 'active',
      org_logo_url: null,
      pwa_enabled: true,
      volunteer_active: true
    };

    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(cachedMembership) });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/voluntario/historial']}>
          <VoluntarioApp />
        </MemoryRouter>
      </HelmetProvider>
    );

    // Should load the app using the cached organization
    await waitFor(() => {
      // Si la carga offline funciona, veremos las pestañas como 'Activas' o 'Mapa'
      expect(screen.queryByText('Activas')).toBeInTheDocument();
    });
  });
});
