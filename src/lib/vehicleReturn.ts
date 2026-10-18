import { supabase } from '@/integrations/supabase/client';

export type OdometerCheck = { ok: true; value: number } | { ok: false; error: string };

/** Valida el kilometraje de llegada (obligatorio para 6-10). */
export function parseReturnOdometer(raw: string | undefined, odometerStart: number | null): OdometerCheck {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, error: 'Falta kilometraje de llegada' };
  const value = Number(text);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return { ok: false, error: 'Kilometraje inválido' };
  if (odometerStart != null && value < odometerStart) {
    return { ok: false, error: `Km menor al de salida (${odometerStart})` };
  }
  return { ok: true, value };
}

export interface ReturnInput {
  evId: string;
  vehicleId: string;
  code: string;
  odometerEnd: number;
  emergencyId: string;
  orgId: string;
  userId: string | null;
}

/**
 * Marca 6-10 (en cuartel) para UN móvil. Solo confirma si el servidor guardó la fila:
 * si el móvil ya estaba en cuartel (otra consola se adelantó) lanza error en vez de duplicar.
 */
export async function returnVehicleToQuarters(i: ReturnInput): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('emergency_vehicles')
    .update({ released_at: now, operational_status: 'en_cuartel', status_updated_at: now, odometer_end: i.odometerEnd })
    .eq('id', i.evId)
    .is('released_at', null)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Ya estaba en cuartel o no se pudo guardar');

  const { error: vErr } = await supabase
    .from('vehicles').update({ status: 'disponible', odometer: i.odometerEnd }).eq('id', i.vehicleId);
  if (vErr) throw new Error(`6-10 guardado, pero no se actualizó el móvil: ${vErr.message}`);

  // La consola manda: sugerencias pendientes del móvil quedan reemplazadas.
  await supabase
    .from('vehicle_operational_requests')
    .update({ status: 'reemplazada', resolved_at: now, resolved_by: i.userId })
    .eq('emergency_vehicle_id', i.evId)
    .eq('status', 'pendiente');

  await supabase.from('emergency_log').insert({
    emergency_id: i.emergencyId,
    organization_id: i.orgId,
    message: `Móvil ${i.code} marcó clave 6-10 — en cuartel (km: ${i.odometerEnd})`,
    created_by: i.userId,
  });
}

export type BatchResult = { code: string; ok: boolean; error?: string };

/** Ejecuta las operaciones una por una y registra el resultado individual de cada móvil. */
export async function runSequential<T extends { code: string }>(
  items: T[],
  fn: (item: T) => Promise<void>,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const item of items) {
    try {
      await fn(item);
      results.push({ code: item.code, ok: true });
    } catch (e) {
      results.push({ code: item.code, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
