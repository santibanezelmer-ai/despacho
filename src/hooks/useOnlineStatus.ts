import { useState, useEffect, useSyncExternalStore } from 'react';
import { getSyncQueueCount } from '@/services/offlineDb';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const count = await getSyncQueueCount();
        setPendingCount(count);
      } catch {
        setPendingCount(0);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  return { isOnline, pendingCount };
}
