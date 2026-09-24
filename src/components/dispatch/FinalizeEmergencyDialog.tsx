import { AlertTriangle, CheckCircle2, Loader2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleReturnManager from './VehicleReturnManager';
import VehiclePersonnelManager from './VehiclePersonnelManager';
import { useEmergencyReturnVehicles } from '@/hooks/useEmergencyReturnVehicles';
import { useEmergencyCrewRoles } from '@/hooks/useEmergencyCrewRoles';

interface Props {
  emergencyId: string;
  emergencyStatus: string;
  folio: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Valida el cierre de una emergencia: obliga a registrar conductor y oficial a
 * cargo en cada móvil y a enviar todos los móviles a cuartel (con kilometraje),
 * reutilizando VehiclePersonnelManager y VehicleReturnManager.
 */
export default function FinalizeEmergencyDialog({ emergencyId, emergencyStatus, folio, onConfirm, onClose }: Props) {
  const { data: vehicles, isLoading } = useEmergencyReturnVehicles(emergencyId);
  const { data: crew, isLoading: crewLoading } = useEmergencyCrewRoles(emergencyId);

  const pending = (vehicles ?? []).filter(v => !v.released_at);

  const missingCrew = (vehicles ?? [])
    .map(v => {
      const roles = (crew ?? []).filter(c => c.emergency_vehicle_id === v.id).map(c => c.role);
      const missing: string[] = [];
      if (!roles.includes('conductor')) missing.push('Conductor');
      if (!roles.includes('oficial_a_cargo')) missing.push('Oficial a Cargo');
      return { code: v.vehicles?.code ?? 'Móvil', missing };
    })
    .filter(v => v.missing.length > 0);

  const loading = isLoading || crewLoading;
  const canFinalize = !loading && pending.length === 0 && missingCrew.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="console-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Finalizar emergencia {folio}</h3>
            {loading ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando móviles y tripulación…
              </p>
            ) : missingCrew.length > 0 ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-warning">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Falta registrar conductor u oficial a cargo.
              </p>
            ) : pending.length > 0 ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Hay móviles que aún no han sido enviados a cuartel.
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tripulación y móviles registrados correctamente.
              </p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {missingCrew.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning">Tripulación incompleta</p>
              <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                {missingCrew.map(v => (
                  <li key={v.code} className="font-mono">
                    {v.code}: falta {v.missing.join(' y ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingCrew.length > 0 && <VehiclePersonnelManager emergencyId={emergencyId} />}

          <VehicleReturnManager
            emergencyId={emergencyId}
            emergencyStatus={emergencyStatus}
            forceVisible
            hideCloseButton
            deferQuarters
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-4">
          <span className="text-[10px] font-mono text-muted-foreground">
            {missingCrew.length > 0
              ? `${missingCrew.length} móvil(es) sin tripulación completa`
              : pending.length > 0
                ? `${pending.length} móvil(es) pendiente(s)`
                : 'Sin pendientes'}
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
