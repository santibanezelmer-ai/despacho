import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Ficha integral del móvil. La bitácora y el historial de emergencias se leen
 * de Operaciones (emergency_vehicles / emergency_personnel); no se duplica
 * ninguna información que ya exista allí.
 */
export function useVehicleProfile(vehicleId?: string | null) {
  const { orgId } = useOrganization();
  const enabled = !!vehicleId && !!orgId;

  const maintenance = useQuery({
    queryKey: ['vehicle-maintenance', vehicleId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const documents = useQuery({
    queryKey: ['vehicle-documents', vehicleId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('expires_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const checklists = useQuery({
    queryKey: ['vehicle-checklists', vehicleId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_checklists')
        .select('*, emergencies(folio)')
        .eq('vehicle_id', vehicleId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  /** Bitácora + historial: salidas del móvil registradas en Operaciones. */
  const logbook = useQuery({
    queryKey: ['vehicle-logbook', vehicleId],
    enabled,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergency_vehicles')
        .select(`
          id, assigned_at, released_at, odometer_start, odometer_end, volunteer_count,
          emergencies(id, folio, address, status, created_at, finished_at, emergency_keys(code, name, color)),
          emergency_personnel(id, role, volunteers(id, name, code))
        `)
        .eq('vehicle_id', vehicleId!)
        .order('assigned_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return { maintenance, documents, checklists, logbook };
}

/** Días restantes hasta una fecha (negativo = vencido). */
export function daysUntil(date?: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export type AlertLevel = 'ok' | 'warning' | 'danger';

export function expiryLevel(date?: string | null): AlertLevel {
  const d = daysUntil(date);
  if (d === null) return 'ok';
  if (d < 0) return 'danger';
  if (d <= 30) return 'warning';
  return 'ok';
}

/** Alerta de mantención según próxima fecha o kilometraje objetivo. */
export function maintenanceAlert(
  records: any[] | undefined,
  currentOdometer?: number | null
): { level: AlertLevel; message: string | null; next: any | null } {
  const withNext = (records ?? []).filter(r => r.next_service_date || r.next_service_odometer);
  const next = withNext[0] ?? null;
  if (!next) return { level: 'ok', message: null, next: null };

  const d = daysUntil(next.next_service_date);
  const kmLeft =
    next.next_service_odometer != null && currentOdometer != null
      ? next.next_service_odometer - currentOdometer
      : null;

  if ((d !== null && d < 0) || (kmLeft !== null && kmLeft <= 0)) {
    return { level: 'danger', message: 'Mantención vencida', next };
  }
  if ((d !== null && d <= 15) || (kmLeft !== null && kmLeft <= 500)) {
    return { level: 'warning', message: 'Mantención próxima', next };
  }
  return { level: 'ok', message: null, next };
}
