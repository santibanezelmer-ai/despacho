import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleReturnManager from './VehicleReturnManager';
import { useEmergencyReturnVehicles } from '@/hooks/useEmergencyReturnVehicles';

interface Props {
  emergencyId: string;
  emergencyStatus: string;
  folio: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Valida el cierre de una emergencia: si quedan móviles sin liberar, obliga a
 * registrarlos en cuartel (con kilometraje) reutilizando VehicleReturnManager.
 */
export default function FinalizeEmergencyDialog({ emergencyId, emergencyStatus, folio, onConfirm, onClose }: Props) {
  const { data: vehicles, isLoading } = useEmergencyReturnVehicles(emergencyId);
  const pending = (vehicles ?? []).filter(v => !v.released_at);
  const canFinalize = !isLoading && pending.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="console-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Finalizar emergencia {folio}</h3>
            {isLoading ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando móviles asignados…
              </p>
            ) : pending.length > 0 ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Hay móviles que aún no han sido enviados a cuartel.
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Todos los móviles están en cuartel.
              </p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <VehicleReturnManager
            emergencyId={emergencyId}
            emergencyStatus={emergencyStatus}
            forceVisible
            hideCloseButton
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-4">
          <span className="text-[10px] font-mono text-muted-foreground">
            {pending.length > 0 ? `${pending.length} móvil(es) pendiente(s)` : 'Sin pendientes'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" disabled={!canFinalize} onClick={onConfirm}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Finalizar emergencia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
