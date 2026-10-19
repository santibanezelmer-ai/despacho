import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { usePendingOperationalRequests, useResolveOperationalRequest, type VehicleOperationalRequest } from '@/hooks/useVehicleOperationalRequests';
import { useVehicleOperationalStatus } from '@/hooks/useVehicleOperationalStatus';
import { returnVehicleToQuarters } from '@/lib/vehicleReturn';

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));

vi.mock('@/contexts/OrganizationContext', () => ({ useOrganization: () => ({ orgId: 'org-1' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const filters: ((row: Row) => boolean)[] = [];
      let update: Row | undefined;
      let insert: Row | undefined;
      let single = false;
      const execute = async () => {
        const rows = state.tables[table] ?? [];
        if (insert) rows.push(insert);
        const selected = rows.filter(row => filters.every(filter => filter(row)));
        if (update) selected.forEach(row => Object.assign(row, update));
        return { data: single ? selected[0] ?? null : selected, error: null };
      };
      const builder = {
        select: () => builder,
        update: (values: Row) => { update = values; return builder; },
        insert: (values: Row) => { insert = values; return builder; },
        eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return builder; },
        neq: (field: string, value: unknown) => { filters.push(row => row[field] !== value); return builder; },
        is: (field: string, value: unknown) => { filters.push(row => row[field] === value); return builder; },
        order: () => builder,
        single: () => { single = true; return execute(); },
        maybeSingle: () => { single = true; return execute(); },
        then: (resolve: (result: Awaited<ReturnType<typeof execute>>) => unknown) => execute().then(resolve),
      };
      return builder;
    },
  },
}));

let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function requests() { return state.tables.vehicle_operational_requests; }
function seed(key = '6-3') {
  const base = {
    emergency_id: 'em-1', emergency_vehicle_id: 'ev-1', vehicle_id: 'vehicle-1',
    organization_id: 'org-1', reported_at: '2026-10-19T02:00:00.000Z',
    status: 'pendiente', odometer_end: null, message: null,
  };
  state.tables = {
    vehicle_operational_requests: [
      { ...base, id: 'key-1', requested_status: key },
      { ...base, id: 'report-1', requested_status: 'PRE-INFORME', message: 'Humo en segundo piso' },
      { ...base, id: 'report-2', requested_status: 'PRE-INFORME', message: 'Evacuación completa' },
      { ...base, id: 'other-key', emergency_vehicle_id: 'ev-2', requested_status: '6-9' },
    ],
    emergencies: [{ id: 'em-1', organization_id: 'org-1', status: 'controlada', pre_report: 'Informe anterior' }],
    emergency_vehicles: [{ id: 'ev-1', released_at: null }],
    vehicles: [{ id: 'vehicle-1' }],
    emergency_log: [],
  };
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  seed();
});
afterEach(() => { cleanup(); client.clear(); });

describe('Pre-informes independientes de claves operativas', () => {
  it.each(['6-3', '6-7', '6-8', '6-9'])('confirmar %s conserva ambos pre-informes pendientes', async key => {
    seed(key);
    const { result } = renderHook(() => useResolveOperationalRequest(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ request: requests()[0] as unknown as VehicleOperationalRequest, accept: true, vehicleCode: 'B-1' });
    });
    expect(requests()[0].status).toBe('aceptada');
    expect(requests().filter(row => row.requested_status === 'PRE-INFORME').map(row => row.status)).toEqual(['pendiente', 'pendiente']);
  });

  it('cambiar la clave manualmente reemplaza solo claves del mismo móvil', async () => {
    const { result } = renderHook(() => useVehicleOperationalStatus(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ evId: 'ev-1', emergencyId: 'em-1', vehicleCode: 'B-1', status: 'en_lugar' });
    });
    expect(requests().map(row => row.status)).toEqual(['reemplazada', 'pendiente', 'pendiente', 'pendiente']);
  });

  it('registrar 6-10 conserva los pre-informes y la protección de doble retorno', async () => {
    seed('6-10');
    const input = { evId: 'ev-1', vehicleId: 'vehicle-1', code: 'B-1', odometerEnd: 120, emergencyId: 'em-1', orgId: 'org-1', userId: 'operator-1' };
    await returnVehicleToQuarters(input);
    expect(requests().map(row => row.status)).toEqual(['reemplazada', 'pendiente', 'pendiente', 'pendiente']);
    expect(state.tables.emergency_vehicles[0].odometer_end).toBe(120);
    await expect(returnVehicleToQuarters(input)).rejects.toThrow('Ya estaba en cuartel');
  });

  it('después de confirmar la clave, permite consultar y aceptar el pre-informe sin perder el anterior', async () => {
    const { result } = renderHook(() => useResolveOperationalRequest(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ request: requests()[0] as unknown as VehicleOperationalRequest, accept: true, vehicleCode: 'B-1' });
    });
    const { result: pending } = renderHook(() => usePendingOperationalRequests(), { wrapper: Wrapper });
    const rows = await pending.current.refetch();
    const report = rows.data?.find(row => row.id === 'report-1');
    expect(report?.message).toBe('Humo en segundo piso');
    if (!report) throw new Error('El pre-informe desapareció de pendientes');
    await act(async () => {
      await result.current.mutateAsync({ request: report, accept: true, vehicleCode: 'B-1' });
    });
    expect(state.tables.emergencies[0].pre_report).toContain('Informe anterior\n\n[B-1 ');
    expect(state.tables.emergencies[0].pre_report).toContain('Humo en segundo piso');
    expect(requests()[1].status).toBe('aceptada');
    expect(requests()[2].status).toBe('pendiente');
  });
});