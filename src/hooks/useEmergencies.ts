import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineCache } from '@/hooks/useOfflineCache';
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

      const enriched = await Promise.all(
        (data ?? []).map(async (e: any) => {
          const { data: evData } = await supabase
            .from('emergency_vehicles')
            .select('vehicle_id, released_at, vehicles(code)')
            .eq('emergency_id', e.id)
            .is('released_at', null);

          const { count: personnelCount } = await supabase
            .from('emergency_personnel')
            .select('id', { count: 'exact', head: true })
            .eq('emergency_id', e.id);

          // Un móvil solo debe aparecer una vez, y solo si sigue asignado
          const assigned = new Map<string, string>();
          for (const ev of evData ?? []) {
            const id = (ev as any).vehicle_id as string | null;
            if (!id || assigned.has(id)) continue;
            assigned.set(id, ((ev as any).vehicles?.code as string) ?? '—');
          }

          return {
            ...e,
            vehicleCodes: Array.from(assigned.values()),
            vehicleIds: Array.from(assigned.keys()),
            personnelCount: personnelCount ?? 0,
          };
        })
      );

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
    refetchInterval: isOnline ? 5000 : false,
    retry: isOnline ? 3 : 0,
  });

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
