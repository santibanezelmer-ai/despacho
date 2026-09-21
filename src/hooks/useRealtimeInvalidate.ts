import { useEffect, useMemo } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Handler = () => void;

type Entry = {
  channel: RealtimeChannel;
  handlers: Set<Handler>;
};

/**
 * Registro global de canales Realtime.
 * Garantiza UN solo canal (y un solo listener de postgres_changes) por
 * tabla + organización, sin importar cuántos componentes lo usen.
 */
const registry = new Map<string, Entry>();

function acquire(table: string, orgId: string, handler: Handler): () => void {
  const key = `${table}:${orgId}`;
  let entry = registry.get(key);

  if (!entry) {
    const handlers = new Set<Handler>();
    const channel = supabase
      .channel(`rt-${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `organization_id=eq.${orgId}` },
        () => {
          registry.get(key)?.handlers.forEach((h) => h());
        },
      )
      .subscribe();
    entry = { channel, handlers };
    registry.set(key, entry);
  }

  entry.handlers.add(handler);

  return () => {
    const current = registry.get(key);
    if (!current) return;
    current.handlers.delete(handler);
    if (current.handlers.size === 0) {
      registry.delete(key);
      supabase.removeChannel(current.channel);
    }
  };
}

/**
 * Invalida las queries indicadas cuando cambia la tabla en la base de datos.
 * Realtime es el mecanismo principal de actualización; el polling de baja
 * frecuencia de cada hook queda solo como reconciliación de respaldo.
 */
export function useRealtimeInvalidate(
  table: string,
  orgId: string | null | undefined,
  queryKeys: QueryKey[],
) {
  const queryClient = useQueryClient();
  const serializedKeys = JSON.stringify(queryKeys);
  const keys = useMemo<QueryKey[]>(() => JSON.parse(serializedKeys), [serializedKeys]);

  useEffect(() => {
    if (!orgId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      // Agrupa ráfagas de eventos en una sola revalidación.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }, 250);
    };

    const release = acquire(table, orgId, handler);

    return () => {
      if (timer) clearTimeout(timer);
      release();
    };
  }, [table, orgId, keys, queryClient]);
}
