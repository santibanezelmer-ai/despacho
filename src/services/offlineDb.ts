import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'operix-offline';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update';
  data: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cache stores for read access
        if (!db.objectStoreNames.contains('emergencies')) {
          db.createObjectStore('emergencies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vehicles')) {
          db.createObjectStore('vehicles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('volunteers')) {
          db.createObjectStore('volunteers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('emergency_keys')) {
          db.createObjectStore('emergency_keys', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('companies')) {
          db.createObjectStore('companies', { keyPath: 'id' });
        }
        // Sync queue for pending offline operations
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by_created', 'createdAt');
        }
        // Metadata (last sync time, etc.)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Generic cache operations ─────────────────────────────

export async function cacheAll<T extends { id: string }>(storeName: string, items: T[]) {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.clear();
  for (const item of items) {
    await store.put(item);
  }
  await tx.done;
  // Save last sync time
  await setMeta(`${storeName}_lastSync`, new Date().toISOString());
}

export async function getCached<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return (await db.getAll(storeName)) as T[];
}

export async function getCachedById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get(storeName, id)) as T | undefined;
}

export async function putCached<T extends { id: string }>(storeName: string, item: T) {
  const db = await getDb();
  await db.put(storeName, item);
}

// ─── Sync queue operations ────────────────────────────────

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>) {
  const db = await getDb();
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await db.put('sync_queue', entry);
  return entry;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return (await db.getAllFromIndex('sync_queue', 'by_created')) as SyncQueueItem[];
}

export async function removeSyncQueueItem(id: string) {
  const db = await getDb();
  await db.delete('sync_queue', id);
}

export async function updateSyncQueueItem(item: SyncQueueItem) {
  const db = await getDb();
  await db.put('sync_queue', item);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDb();
  return await db.count('sync_queue');
}

// ─── Metadata ─────────────────────────────────────────────

export async function setMeta(key: string, value: unknown) {
  const db = await getDb();
  await db.put('meta', { key, value });
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row?.value as T | undefined;
}
