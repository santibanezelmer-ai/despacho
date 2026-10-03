import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useVehicles } from '@/hooks/useVehicles';
import { vehicleStatusMeta } from '@/lib/vehicleOperationalStatus';

/**
 * Disponibilidad de móviles para asignación.
 * - En cuartel ("disponible"): asignable.
 * - En emergencia activa sin 6-9: bloqueado.
 * - En emergencia activa con 6-9 informado: asignable (reasignación directa, sin volver a cuartel).
 * - En emergencia de clave 10-9: asignable (actividad visible, no bloquea).
 */
export type OpenAssignment = {
  evId: string;
  vehicleId: string;
  emergencyId: string;
  folio: string;
  operationalStatus: string;
  keyCode: string;
  keyName: string;
};

export type VehicleAvailability = {
  id: string;
  code: string;
  type: string;
  assignable: boolean;
  /** 'cuartel' | 'reasignable_69' | 'servicio_109' | 'bloqueado' | 'no_operativo' */
  kind: 'cuartel' | 'reasignable_69' | 'servicio_109' | 'bloqueado' | 'no_operativo';
  label: string;
  assignment: OpenAssignment | null;
};

export function is109Key(code?: string | null) {
  const c = (code ?? '').replace(/\s/g, '').toLowerCase();
  return c === '10-9' || c === '109';
}

/** Una participación abierta libera al móvil si informó 6-9 o es un 10-9. */
export function assignmentAllowsReassign(a: { operationalStatus: string; keyCode: string }) {
  return a.operationalStatus === 'retirandose' || is109Key(a.keyCode);
}

async function fetchOpenAssignments(orgId: string, vehicleIds?: string[]): Promise<OpenAssignment[]> {
  let q = supabase
    .from('emergency_vehicles')
    .select('id, vehicle_id, emergency_id, operational_status, emergencies!inner(folio, status, emergency_keys(code, name))')
    .eq('organization_id', orgId)
    .is('released_at', null)
    .neq('emergencies.status', 'finalizada');
  if (vehicleIds?.length) q = q.in('vehicle_id', vehicleIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    evId: r.id,
    vehicleId: r.vehicle_id,
    emergencyId: r.emergency_id,
    folio: r.emergencies?.folio ?? '',
    operationalStatus: r.operational_status ?? 'despachado',
    keyCode: r.emergencies?.emergency_keys?.code ?? '',
    keyName: r.emergencies?.emergency_keys?.name ?? '',
  }));
}

export function useVehicleAvailability(excludeEmergencyId?: string) {
  const { orgId } = useOrganization();
  const { data: vehicles } = useVehicles({ refetchInterval: 5000 });
  const { data: open } = useQuery({
    queryKey: ['open-vehicle-assignments', orgId],
    queryFn: () => fetchOpenAssignments(orgId!),
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  const list: VehicleAvailability[] = (vehicles ?? []).map((v: any) => {
    const mine = (open ?? []).filter(a => a.vehicleId === v.id && a.emergencyId !== excludeEmergencyId);
    const blocking = mine.find(a => !assignmentAllowsReassign(a));
    const current = blocking ?? mine[0] ?? null;
    const base = { id: v.id, code: v.code, type: v.type, assignment: current };
    if (blocking) {
      const m = vehicleStatusMeta(blocking.operationalStatus);
      return { ...base, assignable: false, kind: 'bloqueado' as const, label: `${blocking.folio} · ${m.code} ${m.label} · No disponible` };
    }
    if (current) {
      if (is109Key(current.keyCode) && current.operationalStatus !== 'retirandose') {
        return { ...base, assignable: true, kind: 'servicio_109' as const, label: `10-9 en curso (${current.folio}) · Asignable` };
      }
      return { ...base, assignable: true, kind: 'reasignable_69' as const, label: `6-9 · Disponible para reasignación (${current.folio})` };
    }
    if (v.status === 'disponible') return { ...base, assignable: true, kind: 'cuartel' as const, label: 'Disponible' };
    if (v.status === 'en_servicio') return { ...base, assignable: false, kind: 'bloqueado' as const, label: 'En servicio · No disponible' };
    return { ...base, assignable: false, kind: 'no_operativo' as const, label: v.status === 'mantencion' ? 'En mantención' : 'Fuera de servicio' };
  });
  return list;
}

/** Móviles seleccionados que hoy están comprometidos sin 6-9 / 10-9 (consulta al servidor). */
export async function findVehicleConflicts(orgId: string, vehicleIds: string[]) {
  if (!vehicleIds.length) return [] as OpenAssignment[];
  const open = await fetchOpenAssignments(orgId, vehicleIds);
  return open.filter(a => !assignmentAllowsReassign(a));
}

/**
 * Antes de asignar: vuelve a comprobar en el servidor y cierra (sin borrar) la
 * participación anterior de móviles con 6-9 / 10-9. Lanza error si alguno sigue
 * comprometido sin 6-9 (evita asignación simultánea accidental).
 */
export async function prepareReassignment(params: {
  orgId: string;
  vehicleIds: string[];
  targetEmergencyId: string;
  targetLabel: string;
  vehicleCodes: Record<string, string>;
  userId?: string | null;
}) {
  const { orgId, vehicleIds, targetEmergencyId, targetLabel, vehicleCodes, userId } = params;
  if (!vehicleIds.length) return [] as OpenAssignment[];
  const open = (await fetchOpenAssignments(orgId, vehicleIds)).filter(a => a.emergencyId !== targetEmergencyId);
  const blocked = open.filter(a => !assignmentAllowsReassign(a));
  if (blocked.length) {
    const codes = blocked.map(b => `${vehicleCodes[b.vehicleId] ?? 'Móvil'} (${b.folio})`).join(', ');
    throw new Error(`Móvil comprometido sin 6-9: ${codes}`);
  }
  const now = new Date().toISOString();
  for (const a of open) {
    const { error } = await supabase.from('emergency_vehicles').update({ released_at: now }).eq('id', a.evId);
    if (error) throw error;
    const from = is109Key(a.keyCode) && a.operationalStatus !== 'retirandose' ? '10-9' : '6-9';
    await supabase.from('emergency_log').insert({
      emergency_id: a.emergencyId,
      organization_id: orgId,
      created_by: userId ?? null,
      message: `Móvil ${vehicleCodes[a.vehicleId] ?? ''} reasignado a ${targetLabel} desde ${from} (sin retorno a cuartel)`,
    });
  }
  return open;
}
