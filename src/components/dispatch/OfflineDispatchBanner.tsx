import { useEffect, useState, useSyncExternalStore } from 'react';
import { WifiOff, CheckCircle2, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmergencyKeys } from '@/hooks/useEmergencyKeys';
import { precacheTones } from '@/services/toneCache';
import {
  getPendingDispatches,
  subscribePendingDispatches,
  syncPendingDispatches,
  discardPendingDispatch,
} from '@/services/offlineDispatchQueue';

let snapshot = JSON.stringify(getPendingDispatches());
const getSnap = () => {
  const next = JSON.stringify(getPendingDispatches());
  if (next !== snapshot) snapshot = next;
  return snapshot;
};

/** Cola de despachos sin conexión: aviso, sincronización y precarga de tonos. */
export default function OfflineDispatchBanner() {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const raw = useSyncExternalStore(subscribePendingDispatches, getSnap);
  const pending = JSON.parse(raw) as ReturnType<typeof getPendingDispatches>;
  const [busy, setBusy] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const { data: companies } = useCompanies();
  const { data: keys } = useEmergencyKeys();

  // Guardar tonos para poder sonar sin internet
  useEffect(() => {
    if (!isOnline) return;
    void precacheTones([
      ...((companies ?? []) as any[]).map(c => c.tone_url),
      ...((keys ?? []) as any[]).map(k => k.tone_url),
    ]);
  }, [isOnline, companies, keys]);

  const runSync = async () => {
    setBusy(true);
    const { synced, failed } = await syncPendingDispatches();
    setBusy(false);
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`${synced} despacho(s) sin conexión sincronizado(s)`);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 6000);
    }
    if (failed > 0) toast.error(`${failed} despacho(s) no se pudieron sincronizar. Revisa y reintenta.`);
  };

  const hasPending = pending.length > 0;
  useEffect(() => {
    if (!isOnline || !hasPending) return;
    void runSync();
    const t = setInterval(() => void runSync(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, hasPending]);

  if (!hasPending && !justSynced) return null;

  if (!hasPending && justSynced) {
    return (
      <div className="flex items-center gap-2 border-b border-success/40 bg-success/15 px-4 py-2 text-sm font-semibold text-success">
        <CheckCircle2 className="h-4 w-4" /> Sincronizado — los despachos sin conexión ya están en el sistema
      </div>
    );
  }

  return (
    <div className="border-b border-emergency/50 bg-emergency/15 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-semibold text-emergency">
        <WifiOff className="h-4 w-4" />
        {isOnline ? 'Enviando despachos pendientes' : 'Sin conexión'} — {pending.length} despacho(s) en cola
        {isOnline && (
          <Button size="sm" variant="outline" className="ml-auto h-7" onClick={runSync} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Reintentar
          </Button>
        )}
      </div>
      <ul className="mt-1 space-y-1">
        {pending.map(d => (
          <li key={d.clientId} className="flex items-center gap-2 text-foreground">
            <span className="status-badge bg-warning/20 text-warning">Pendiente de envío</span>
            <span className="font-mono font-bold">{d.keyCode}</span>
            <span className="truncate">{d.address}</span>
            {d.vehicleLabels.length > 0 && (
              <span className="text-muted-foreground">· {d.vehicleLabels.join(', ')}</span>
            )}
            <span className="text-muted-foreground">
              · {new Date(d.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {d.lastError && (
              <>
                <span className="text-emergency">· {d.lastError}</span>
                <button
                  className="ml-auto text-muted-foreground hover:text-emergency"
                  title="Descartar"
                  onClick={() => {
                    if (confirm('¿Descartar este despacho pendiente?')) discardPendingDispatch(d.clientId);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
