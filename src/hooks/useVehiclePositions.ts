import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export type VehicleLastPosition = {
  vehicle_id: string;
  organization_id: string;
  emergency_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  captured_at: string;
  updated_at: string;
  vehicles: { id: string; code: string; status: string } | null;
};

/** Antigüedad de la posición en segundos. */
export function positionAgeSeconds(capturedAt: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(capturedAt).getTime()) / 1000));
}

/** Una posición se considera desactualizada tras 60 segundos sin actualizarse. */
export const STALE_POSITION_SECONDS = 60;

export function isPositionStale(capturedAt: string): boolean {
  return positionAgeSeconds(capturedAt) > STALE_POSITION_SECONDS;
}

export function formatPositionAge(capturedAt: string): string {
  const s = positionAgeSeconds(capturedAt);
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

/**
 * Última ubicación conocida de los móviles de la organización.
 * Alimentada por la futura aplicación Operix Móvil (tabla vehicle_last_positions).
 */
export function useVehicleLastPositions(options: { emergencyId?: string; refetchInterval?: number } = {}) {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['vehicle-last-positions', orgId, options.emergencyId ?? null],
    queryFn: async () => {
      let q = (supabase as any)
        .from('vehicle_last_positions')
        .select('*, vehicles(id, code, status)')
        .eq('organization_id', orgId);
      if (options.emergencyId) q = q.eq('emergency_id', options.emergencyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VehicleLastPosition[];
    },
    enabled: !!orgId,
    refetchInterval: options.refetchInterval ?? 5000,
  });
}
