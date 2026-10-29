import { Suspense } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VoluntarioApp from '@/pages/voluntario/VoluntarioApp';

const auth = vi.hoisted(() => ({ user: { id: 'volunteer' }, loading: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const result = table === 'organization_members'
    ? { data: [{ organization_id: 'org', organizations: { name: 'Cuerpo', status: 'active' } }], error: null }
    : { data: { status: 'activo', pwa_enabled: true }, error: null };
  const query: any = { select: () => query, eq: () => query, maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return query;
} } }));
vi.mock('@/services/fcmWebPush', () => ({ ensureVolunteerServiceWorker: async () => {}, registerVolunteerPush: async () => {}, listenForeground: () => () => {} }));
vi.mock('@/services/defaultDispatchTone', () => ({ playDefaultDispatchTone: vi.fn() }));
vi.mock('@/pages/voluntario/VoluntarioLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/pages/voluntario/VoluntarioFeed', () => ({ default: () => null }));
vi.mock('@/pages/voluntario/VoluntarioLogin', () => ({ default: () => null }));
vi.mock('@/pages/voluntario/VoluntarioDetail', () => ({ default: () => null }));
vi.mock('@/pages/voluntario/VoluntarioHistory', () => ({ default: () => null }));
vi.mock('@/pages/voluntario/VoluntarioProfile', () => ({ default: () => null }));
vi.mock('@/pages/voluntario/VoluntarioMap', () => ({ default: () => null }));
vi.mock('@/pages/CompanyDuty', () => ({ default: ({ personal }: { personal: boolean }) => {
  const location = useLocation();
  return <output data-testid="duty">{JSON.stringify({ personal, path: location.pathname, search: location.search })}</output>;
} }));
afterEach(cleanup);

describe('Volunteer duty entry points', () => {
  it.each(['/voluntario/guardias', '/voluntario/guardias?asignacion=request-123'])('opens personal duties at %s without losing the assignment', async path => {
    render(<MemoryRouter initialEntries={[path]}><Suspense fallback={null}><Routes><Route path="/voluntario/*" element={<VoluntarioApp />} /></Routes></Suspense></MemoryRouter>);
    const result = JSON.parse((await screen.findByTestId('duty')).textContent ?? '{}');
    expect(result).toEqual({ personal: true, path: '/voluntario/guardias', search: path.includes('?') ? '?asignacion=request-123' : '' });
  });
});