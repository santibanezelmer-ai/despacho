import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DispatchForm from '@/components/dispatch/DispatchForm';

const state = vi.hoisted(() => ({
  performDispatch: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' } }) }));
vi.mock('@/contexts/OrganizationContext', () => ({ useOrganization: () => ({ orgId: 'org' }) }));
vi.mock('@/contexts/DispatchFormContext', () => ({ DISPATCH_DRAFT_KEY: 'dispatch-test-draft' }));
vi.mock('@/hooks/useScreenTheme', () => ({ useScreenTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/hooks/useVehicles', () => ({ useVehicles: () => ({ data: [] }) }));
vi.mock('@/hooks/useVolunteers', () => ({ useVolunteers: () => ({ data: [] }) }));
vi.mock('@/hooks/useCompanies', () => ({ useCompanies: () => ({ data: [] }) }));
vi.mock('@/hooks/useOrganizationLandmarks', () => ({ useOrganizationLandmarks: () => ({ data: [] }) }));
vi.mock('@/lib/vehicleAvailability', () => ({ useVehicleAvailability: () => [], findVehicleConflicts: vi.fn() }));
vi.mock('@/lib/routeKilometer', () => ({ findNearestRouteKm: async () => null, formatRouteKmAddress: vi.fn() }));
vi.mock('@/services/offlineDispatchQueue', () => ({
  performDispatch: state.performDispatch, enqueueDispatch: vi.fn(), isNetworkError: () => false,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: state.invoke },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
} }));
vi.mock('@/components/dispatch/MapPointPicker', () => ({ default: ({ onPick }: { onPick: (lat: number, lng: number) => void }) =>
  <button onClick={() => onPick(-40.720176, -72.575642)}>Pick point</button> }));
vi.mock('@/components/dispatch/ManualCoordsInput', () => ({ default: ({ onSubmit }: { onSubmit: (lat: number, lng: number) => void }) =>
  <button onClick={() => onSubmit(-40.730176, -72.585642)}>Move point</button> }));
vi.mock('@/components/dispatch/TerritoryStatus', () => ({ default: () => null }));
vi.mock('@/components/dispatch/LocationRequestPanel', () => ({ default: () => null }));
vi.mock('@/components/dispatch/VehicleAvailabilityPicker', () => ({ default: () => null }));

const clients: QueryClient[] = [];
function openForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><DispatchForm
    emergencyKey={{ id: 'key', code: '10-9', name: 'Otros servicios', color: '', tone_url: null } as never}
    onClose={() => {}}
  /></QueryClientProvider>);
}
const addressInput = () => screen.getByPlaceholderText("Ej: Av. Libertador B. O'Higgins 1234") as HTMLInputElement;
beforeEach(() => {
  sessionStorage.clear();
  state.performDispatch.mockClear();
  state.invoke.mockReset().mockImplementation(() => new Promise(() => {}));
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

describe('dispatch during reverse lookup', () => {
  it('submits coordinates immediately while lookup is unresolved and saves a usable draft', async () => {
    openForm();
    fireEvent.click(screen.getByText('Pick point'));
    await waitFor(() => expect(state.invoke).toHaveBeenCalled());
    expect(addressInput().value).toBe('-40.720176, -72.575642');
    expect(JSON.parse(sessionStorage.getItem('dispatch-test-draft') ?? '{}').address).toBe('-40.720176, -72.575642');
    fireEvent.click(screen.getByRole('button', { name: 'Despachar Emergencia' }));
    await waitFor(() => expect(state.performDispatch).toHaveBeenCalledWith(expect.objectContaining({
      address: '-40.720176, -72.575642', latitude: -40.720176, longitude: -72.575642,
    })));
  });
  it('replaces fallback with the resolved street without overwriting manual edits', async () => {
    let finish: (value: unknown) => void = () => {};
    state.invoke.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    openForm();
    fireEvent.click(screen.getByText('Pick point'));
    await waitFor(() => expect(state.invoke).toHaveBeenCalledTimes(1));
    await act(async () => { finish({ data: { address: 'Calle Real 123' } }); });
    expect(addressInput().value).toBe('Calle Real 123');
    fireEvent.click(screen.getByText('Move point'));
    await waitFor(() => expect(state.invoke).toHaveBeenCalledTimes(2));
    fireEvent.change(addressInput(), { target: { value: 'Dirección del operador' } });
    await act(async () => { finish({ data: { address: 'Otra calle' } }); });
    expect(addressInput().value).toBe('Dirección del operador');
  });
  it('ignores a stale lookup after the point moves and falls back when lookup fails', async () => {
    const finishes: Array<(value: unknown) => void> = [];
    state.invoke.mockImplementation(() => new Promise(resolve => finishes.push(resolve)));
    openForm();
    fireEvent.click(screen.getByText('Pick point'));
    await waitFor(() => expect(finishes).toHaveLength(1));
    fireEvent.click(screen.getByText('Move point'));
    await waitFor(() => expect(finishes).toHaveLength(2));
    await act(async () => { finishes[0]({ data: { address: 'Old street' } }); });
    expect(addressInput().value).toBe('-40.730176, -72.585642');
    await act(async () => { finishes[1]({ data: null, error: { message: 'Unavailable' } }); });
    expect(addressInput().value).toBe('-40.730176, -72.585642');
  });
  it('recovers legacy pending drafts on reopen', () => {
    sessionStorage.setItem('dispatch-test-draft', JSON.stringify({
      keyId: 'key', address: 'Obteniendo dirección…',
      locationFix: { latitude: -40.720176, longitude: -72.575642 },
    }));
    openForm();
    expect(addressInput().value).toBe('-40.720176, -72.575642');
  });
  it('blocks legacy pending drafts without a usable location', () => {
    sessionStorage.setItem('dispatch-test-draft', JSON.stringify({ keyId: 'key', address: 'Obteniendo dirección…' }));
    openForm();
    expect(screen.getByRole('button', { name: 'Despachar Emergencia' })).toBeDisabled();
    expect(state.performDispatch).not.toHaveBeenCalled();
  });
});