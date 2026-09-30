import { supabase } from '@/integrations/supabase/client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  type SyncQueueItem,
} from './offlineDb';
import { toast } from 'sonner';

const MAX_RETRIES = 5;
// After MAX_RETRIES the item is kept (never deleted) and retried only at this slow pace
const FAILED_RETRY_INTERVAL_MS = 10 * 60 * 1000;
let syncing = false;

type TrackedSyncItem = SyncQueueItem & {
  status?: 'pending' | 'failed';
  lastError?: string;
  lastAttemptAt?: string;
};

// Real, writable columns of public.emergencies. Anything else (joins, UI fields, local metadata) is dropped.
const EMERGENCY_COLUMNS = new Set([
  'id', 'folio', 'emergency_key_id', 'address', 'reference', 'caller_name', 'caller_phone',
  'observations', 'latitude', 'longitude', 'status', 'created_by', 'dispatched_at', 'en_route_at',
  'working_at', 'controlled_at', 'finished_at', 'pre_report', 'created_at', 'updated_at',
  'organization_id', 'external_support', 'declared', 'declared_at', 'carabineros_requested',
  'ambulance_requested', 'in_quarters_at', 'false_alarm', 'location_source',
  'location_shared_latitude', 'location_shared_longitude', 'location_source_updated_at',
  'location_source_updated_by',
]);
// Columns that must never be changed by an offline update
const EMERGENCY_UPDATE_IMMUTABLE = new Set(['id', 'organization_id', 'folio', 'created_at', 'created_by']);

function sanitize(table: string, data: Record<string, unknown>, operation: 'insert' | 'update') {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_') || v === undefined) continue;
    if (table === 'emergencies') {
      if (!EMERGENCY_COLUMNS.has(k)) continue;
      if (operation === 'update' && EMERGENCY_UPDATE_IMMUTABLE.has(k)) continue;
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      continue; // drop nested relation objects for other tables
    }
    out[k] = v;
  }
  return out;
}

export async function processSyncQueue(opts: { force?: boolean } = {}): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const queue = (await getSyncQueue()) as TrackedSyncItem[];
    if (queue.length === 0) return { synced: 0, failed: 0 };

    const now = Date.now();
    for (const item of queue) {
      if (!opts.force && item.retries >= MAX_RETRIES && item.lastAttemptAt &&
          now - new Date(item.lastAttemptAt).getTime() < FAILED_RETRY_INTERVAL_MS) {
        continue; // throttle already-failed items; kept for later recovery
      }
      try {
        await syncItem(item);
        await removeSyncQueueItem(item.id);
        synced++;
      } catch (err: any) {
        const retries = item.retries + 1;
        const message = err?.message ?? String(err);
        const status = retries >= MAX_RETRIES ? 'failed' : 'pending';
        console.error(`[SyncManager] Failed to sync item ${item.id} (${item.table}/${item.operation}) attempt ${retries} [${status}]:`, err);
        // Never delete: keep the item for retry/recovery
        await updateSyncQueueItem({
          ...item,
          retries,
          status,
          lastError: message,
          lastAttemptAt: new Date().toISOString(),
        } as TrackedSyncItem);
        failed++;
      }
    }

    if (synced > 0) {
      toast.success(`${synced} operación(es) sincronizada(s) correctamente`);
    }
    if (failed > 0) {
      toast.error(`${failed} operación(es) no se pudieron sincronizar. Se conservan para reintentar.`);
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

async function syncItem(item: SyncQueueItem) {
  const { table, operation, data } = item;
  const clean = sanitize(table, data as Record<string, unknown>, operation);

  if (operation === 'insert') {
    const { error } = await supabase.from(table as any).insert(clean as any);
    if (error) throw error;
  } else if (operation === 'update') {
    const id = (data as { id?: string }).id;
    if (!id) throw new Error('Update sin id');
    const { id: _ignored, ...updates } = clean;
    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from(table as any).update(updates as any).eq('id', id);
    if (error) throw error;
  }
}

// Auto-sync listener
let listenerAttached = false;

export function startAutoSync() {
  if (listenerAttached) return;
  listenerAttached = true;

  window.addEventListener('online', () => {
    console.log('[SyncManager] Back online — processing queue');
    // Small delay to let network stabilize; force includes previously failed items
    setTimeout(() => processSyncQueue({ force: true }), 2000);
  });

  // App opened/reloaded while already online: process any pending queue now
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => processSyncQueue(), 1000);
  }
}
