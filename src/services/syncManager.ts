import { supabase } from '@/integrations/supabase/client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  type SyncQueueItem,
} from './offlineDb';
import { toast } from 'sonner';

const MAX_RETRIES = 5;
let syncing = false;

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    for (const item of queue) {
      try {
        await syncItem(item);
        await removeSyncQueueItem(item.id);
        synced++;
      } catch (err) {
        console.error('[SyncManager] Failed to sync item:', item.id, err);
        if (item.retries >= MAX_RETRIES) {
          await removeSyncQueueItem(item.id);
          failed++;
        } else {
          await updateSyncQueueItem({ ...item, retries: item.retries + 1 });
          failed++;
        }
      }
    }

    if (synced > 0) {
      toast.success(`${synced} operación(es) sincronizada(s) correctamente`);
    }
    if (failed > 0) {
      toast.error(`${failed} operación(es) no se pudieron sincronizar`);
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

async function syncItem(item: SyncQueueItem) {
  const { table, operation, data } = item;

  if (operation === 'insert') {
    // Remove offline-only fields
    const { _offline, ...cleanData } = data as Record<string, unknown>;
    const { error } = await supabase.from(table as any).insert(cleanData as any);
    if (error) throw error;
  } else if (operation === 'update') {
    const { id, _offline, ...updates } = data as Record<string, unknown> & { id: string };
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
    // Small delay to let network stabilize
    setTimeout(() => processSyncQueue(), 2000);
  });
}
