import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { addToSyncQueue, putCached, getCachedById, getSyncQueue } from '@/services/offlineDb';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type EmergencyRow = Tables<'emergencies'> & {
  emergency_keys: { code: string; name: string; color: string } | null;
};

export function useActiveEmergencies() {
  const { orgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  const query = useQuery({
    queryKey: ['active-emergencies', orgId],
    queryFn: async () => {
      const q = supabase
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .not('status', 'in', '("en_cuartel")')
        .order('created_at', { ascending: false });
      const { data, error } = await (q as any).eq('organization_id', orgId);
      if (error) throw error;

      const ids = (data ?? []).map((e: any) => e.id);

      // Dos consultas por lote en lugar de dos por emergencia (evita saturar la base).
      const [{ data: evRows }, { data: perRows }] = ids.length
        ? await Promise.all([
            supabase
              .from('emergency_vehicles')
              .select('emergency_id, vehicle_id, released_at, vehicles(code)')
              .in('emergency_id', ids)
              .is('released_at', null),
            supabase
              .from('emergency_personnel')
              .select('emergency_id')
              .in('emergency_id', ids),
          ])
        : [{ data: [] as any[] }, { data: [] as any[] }];

      const assignedByEmergency = new Map<string, Map<string, string>>();
      for (const ev of evRows ?? []) {
        const emgId = (ev as any).emergency_id as string;
        const id = (ev as any).vehicle_id as string | null;
        if (!emgId || !id) continue;
        if (!assignedByEmergency.has(emgId)) assignedByEmergency.set(emgId, new Map());
        const m = assignedByEmergency.get(emgId)!;
        if (!m.has(id)) m.set(id, ((ev as any).vehicles?.code as string) ?? '—');
      }

      const personnelByEmergency = new Map<string, number>();
      for (const p of perRows ?? []) {
        const emgId = (p as any).emergency_id as string;
        personnelByEmergency.set(emgId, (personnelByEmergency.get(emgId) ?? 0) + 1);
      }

      const enriched = (data ?? []).map((e: any) => {
        const assigned = assignedByEmergency.get(e.id) ?? new Map<string, string>();
        return {
          ...e,
          vehicleCodes: Array.from(assigned.values()),
          vehicleIds: Array.from(assigned.keys()),
          personnelCount: personnelByEmergency.get(e.id) ?? 0,
        };
      });

      // Mark emergencies with pending offline operations
      try {
        const queue = await getSyncQueue();
        const pendingIds = new Set(
          queue
            .filter(q => q.table === 'emergencies')
            .map(q => (q.data as any)?.id)
            .filter(Boolean)
        );
        return enriched.map(e => (pendingIds.has(e.id) ? { ...e, _offline: true } : e));
      } catch {
        return enriched;
      }
    },
    enabled: !!orgId,
    // Realtime es el mecanismo principal; el polling queda como reconciliación.
    refetchInterval: isOnline ? 20000 : false,
    retry: isOnline ? 3 : 0,
  });

  useRealtimeInvalidate('emergencies', orgId, [['active-emergencies', orgId]]);
  useRealtimeInvalidate('emergency_vehicles', orgId, [['active-emergencies', orgId]]);

  // Bridge to offline cache
  useOfflineCache(
    ['active-emergencies', orgId],
    'emergencies',
    query.data,
    query.error as Error | null,
    isOnline
  );

  return query;
}

/**
 * Creates an emergency locally when offline and queues it for sync.
 * Returns the temporary local ID.
 */
export async function createOfflineEmergency(
  data: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const tempId = crypto.randomUUID();
  const now = new Date().toISOString();

  const emergencyData = {
    ...data,
    id: tempId,
    organization_id: orgId,
    status: 'despacho',
    created_at: now,
    updated_at: now,
    dispatched_at: now,
    folio: `EMG-OFFLINE-${Date.now()}`,
    _offline: true,
  };

  // Save to local IndexedDB
  await putCached('emergencies', emergencyData as any);

  // Queue for sync
  await addToSyncQueue({
    table: 'emergencies',
    operation: 'insert',
    data: emergencyData,
  });

  toast.info('Emergencia creada en modo offline. Se sincronizará al reconectar.');
  return tempId;
}

/**
 * Updates an emergency locally when offline and queues the update for sync.
 */
export async function updateOfflineEmergency(
  emergencyId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const existing = await getCachedById<Record<string, unknown>>('emergencies', emergencyId);
  const merged = {
    ...(existing ?? { id: emergencyId }),
    ...updates,
    id: emergencyId,
    updated_at: new Date().toISOString(),
    _offline: true,
  };

  await putCached('emergencies', merged as any);

  await addToSyncQueue({
    table: 'emergencies',
    operation: 'update',
    data: merged,
  });

  toast.info('Cambio guardado en modo offline. Se sincronizará al reconectar.');
}
