import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VoluntarioFeed from '@/pages/voluntario/VoluntarioFeed';

const state = vi.hoisted(() => ({ requests: 0, notes: 0 }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'volunteer' } }) }));
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: async () => ({ value: '[]' }), set: async () => {} } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const query: any = { select: () => query, eq: () => query, not: () => query, order: () => query, limit: () => query, gte: () => query,
    then: (resolve: (value: unknown) => unknown) => {
      if (table === 'emergencies') state.requests++;
      if (table === 'dispatch_notes') state.notes++;
      return Promise.resolve({ data: [], error: table === 'emergencies' && state.requests === 1 ? { message: 'Temporary timeout' } : null }).then(resolve);
    } };
  return query;
} } }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Volunteer feed recovery', () => {
  it('keeps polling both queries after a cached response to a temporary online failure', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    state.requests = 0; state.notes = 0;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><VoluntarioFeed organizationId="org" /></MemoryRouter></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(state.requests).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_100); });
    expect(state.requests).toBeGreaterThanOrEqual(2);
    expect(state.notes).toBeGreaterThanOrEqual(2);
    expect(client.getQueryState(['vol-feed', 'org'])?.status).toBe('success');
    client.clear();
  });
});