import { supabase } from '@/integrations/supabase/client';
import { sendPushToOrganization } from '@/services/pushService';

export interface PendingDispatch {
  clientId: string; // se usa como id de la emergencia → evita duplicados
  orgId: string;
  userId: string | null;
  keyId: string;
  keyCode: string;
  keyName: string;
  address: string;
  reference: string | null;
  callerName: string | null;
  callerPhone: string | null;
  observations: string | null;
  latitude: number | null;
  longitude: number | null;
  locationRequestId: string | null;
  vehicleIds: string[];
  vehicleLabels: string[];
  createdAt: string;
  lastError?: string;
}

const STORAGE_KEY = 'operix.offline.dispatches';
const EVENT = 'operix:offline-dispatches';

export function getPendingDispatches(): PendingDispatch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list: PendingDispatch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePendingDispatches(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function enqueueDispatch(d: PendingDispatch) {
  save([...getPendingDispatches(), d]);
}

function updateDispatch(clientId: string, patch: Partial<PendingDispatch>) {
  save(getPendingDispatches().map(d => (d.clientId === clientId ? { ...d, ...patch } : d)));
}

function removeDispatch(clientId: string) {
  save(getPendingDispatches().filter(d => d.clientId !== clientId));
}

/** Detecta errores de red (sin internet, servidor inalcanzable). */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed')
  );
}

/**
 * Misma secuencia que el despacho en línea: emergencia, móviles, bitácora y push.
 * Devuelve el id de la emergencia creada.
 */
export async function performDispatch(d: PendingDispatch, opts: { offlineSync?: boolean } = {}) {
  const { error: eErr } = await supabase.from('emergencies').insert({
    id: d.clientId,
    emergency_key_id: d.keyId,
    organization_id: d.orgId,
    address: d.address,
    reference: d.reference,
    caller_name: d.callerName,
    caller_phone: d.callerPhone,
    observations: d.observations,
    created_by: d.userId,
    latitude: d.latitude,
    longitude: d.longitude,
    folio: '',
  });
  // 23505: ya existía (reintento tras corte a mitad) → continuar
  if (eErr && (eErr as any).code !== '23505') throw eErr;
  const alreadyExisted = !!eErr;

  if (d.locationRequestId) {
    await supabase.from('location_requests').update({ emergency_id: d.clientId }).eq('id', d.locationRequestId);
  }

  // Reintento: completar solo lo que falte (idempotente por paso)
  let missingVehicleIds = d.vehicleIds;
  let logExists = false;
  if (alreadyExisted) {
    const { data: evRows, error: evErr } = await supabase
      .from('emergency_vehicles').select('vehicle_id').eq('emergency_id', d.clientId);
    if (evErr) throw evErr;
    const have = new Set((evRows ?? []).map(r => r.vehicle_id));
    missingVehicleIds = d.vehicleIds.filter(id => !have.has(id));
    const { count, error: lErr } = await supabase
      .from('emergency_log').select('id', { count: 'exact', head: true }).eq('emergency_id', d.clientId);
    if (lErr) throw lErr;
    logExists = (count ?? 0) > 0;
  }

  if (missingVehicleIds.length > 0) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('id, odometer')
      .in('id', missingVehicleIds);
    const odometerMap = new Map((vehicleData ?? []).map(v => [v.id, v.odometer]));
    const { error: vErr } = await supabase.from('emergency_vehicles').insert(
      missingVehicleIds.map(vid => ({
        emergency_id: d.clientId,
        vehicle_id: vid,
        organization_id: d.orgId,
        odometer_start: odometerMap.get(vid) ?? null,
      }))
    );
    if (vErr) throw vErr;
  }
  if (d.vehicleIds.length > 0) {
    const { error: sErr } = await supabase.from('vehicles').update({ status: 'en_servicio' as const }).in('id', d.vehicleIds);
    if (sErr) throw sErr;
  }

  if (!logExists) {
    const time = new Date(d.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const { error: logErr } = await supabase.from('emergency_log').insert({
      emergency_id: d.clientId,
      organization_id: d.orgId,
      message: opts.offlineSync
        ? `Emergencia despachada sin conexión a las ${time}: ${d.keyCode} - ${d.keyName} (sincronizada al reconectar)`
        : `Emergencia despachada: ${d.keyCode} - ${d.keyName}`,
      created_by: d.userId,
    });
    if (logErr) throw logErr;

    sendPushToOrganization(d.orgId, d.clientId, `${d.keyCode} — ${d.keyName}`, `Dirección: ${d.address}`).catch(
      () => {}
    );
  }
  return d.clientId;
}

let syncing = false;

/** Envía en orden los despachos pendientes. Devuelve cuántos se sincronizaron. */
export async function syncPendingDispatches(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const list = [...getPendingDispatches()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const d of list) {
      try {
        await performDispatch(d, { offlineSync: true });
        removeDispatch(d.clientId);
        synced++;
      } catch (err: any) {
        if (isNetworkError(err)) break; // la red volvió a caer: esperar
        updateDispatch(d.clientId, { lastError: err?.message || 'Error desconocido' });
        failed++;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export function discardPendingDispatch(clientId: string) {
  removeDispatch(clientId);
}
