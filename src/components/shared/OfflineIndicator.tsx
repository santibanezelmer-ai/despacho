import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono border-b transition-colors ${
        !isOnline
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-info/10 border-info/30 text-info'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>SIN CONEXIÓN — Modo offline activo</span>
          {pendingCount > 0 && (
            <span className="ml-auto rounded-full bg-destructive/20 px-2 py-0.5 text-[10px]">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </>
      ) : (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sincronizando {pendingCount} operación(es)…</span>
          <CloudUpload className="ml-auto h-3.5 w-3.5" />
        </>
      )}
    </div>
  );
}
