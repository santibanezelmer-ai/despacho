import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { cacheAll, getCached } from '@/services/offlineDb';

/**
 * Bridges TanStack Query with IndexedDB.
 * - On successful fetch: caches data to IndexedDB for offline use.
 * - On fetch error when offline: falls back to cached data.
 */
export function useOfflineCache<T extends { id: string }>(
  queryKey: QueryKey,
  storeName: string,
  data: T[] | undefined,
  error: Error | null,
  isOnline: boolean
) {
  const queryClient = useQueryClient();

  // Cache data whenever we get a successful fetch
  useEffect(() => {
    if (data && data.length > 0 && isOnline) {
      cacheAll(storeName, data).catch(console.error);
    }
  }, [data, storeName, isOnline]);

  // Fallback to cached data when offline and query fails
  useEffect(() => {
    if (!isOnline && (error || !data)) {
      getCached<T>(storeName).then((cached) => {
        if (cached.length > 0) {
          queryClient.setQueryData(queryKey, cached);
        }
      }).catch(console.error);
    }
  }, [isOnline, error, data, storeName, queryClient, queryKey]);
}
