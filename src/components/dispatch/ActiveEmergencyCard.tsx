import { useEffect, useState } from 'react';
import { MapPin, Phone, Truck, Users, Clock, Settings, Shield, Megaphone, Cross, CloudUpload } from 'lucide-react';
import EmergencyActionsPanel from './EmergencyActionsPanel';
import EmergencyPdfDownload from './EmergencyPdfDownload';

const statusConfig: Record<string, { label: string; color: string }> = {
  despacho: { label: 'DESPACHO', color: 'hsl(270, 60%, 55%)' },
  en_ruta: { label: 'EN RUTA', color: 'hsl(35, 95%, 55%)' },
  en_trabajo: { label: 'EN TRABAJO', color: 'hsl(0, 85%, 55%)' },
  controlada: { label: 'CONTROLADA', color: 'hsl(210, 85%, 55%)' },
  finalizada: { label: 'FINALIZADA', color: 'hsl(145, 65%, 42%)' },
  en_cuartel: { label: 'EN CUARTEL', color: 'hsl(200, 50%, 50%)' },
};

function useTimer(startTime: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

interface EmergencyCardProps {
  emergency: {
    id: string;
    folio: string;
    address: string;
    caller_phone: string | null;
    status: string;
    created_at: string;
    latitude?: number | null;
    longitude?: number | null;
    external_support?: boolean;
    declared?: boolean;
    carabineros_requested?: boolean;
    ambulance_requested?: boolean;
    emergency_keys: { code: string; name: string; color: string } | null;
    vehicleCodes: string[];
    vehicleIds: string[];
    personnelCount: number;
    _offline?: boolean;
  };
  onAdvanceStatus?: (id: string, newStatus: string) => void;
}

const STATUS_ORDER = ['despacho', 'en_ruta', 'en_trabajo', 'controlada', 'finalizada', 'en_cuartel'];

export default function ActiveEmergencyCard({ emergency, onAdvanceStatus }: EmergencyCardProps) {
  const timer = useTimer(emergency.created_at);
  const ek = emergency.emergency_keys;
  const status = statusConfig[emergency.status] ?? statusConfig.despacho;
  const currentIdx = STATUS_ORDER.indexOf(emergency.status);
  // en_cuartel is auto-managed by VehicleReturnManager, don't show advance button for it
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 && STATUS_ORDER[currentIdx + 1] !== 'en_cuartel'
    ? STATUS_ORDER[currentIdx + 1]
    : null;
  const [showActions, setShowActions] = useState(false);

  const flags = [
    emergency.external_support && { icon: Shield, label: '10-12', color: 'text-warning' },
    emergency.declared && { icon: Megaphone, label: 'DECL', color: 'text-emergency' },
    emergency.carabineros_requested && { icon: Shield, label: '1-0', color: 'text-info' },
    emergency.ambulance_requested && { icon: Cross, label: '1-2', color: 'text-success' },
  ].filter(Boolean) as { icon: any; label: string; color: string }[];

  return (
    <>
      <div className="console-panel overflow-hidden transition-all hover:border-foreground/20">
        <div className="h-1" style={{ backgroundColor: ek?.color ?? 'hsl(0,85%,55%)' }} />

        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-mono font-bold"
                style={{ backgroundColor: ek?.color ?? '#dc2626', color: '#fff' }}
              >
                {ek?.code ?? '—'}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{emergency.folio}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {emergency._offline && (
                <span
                  className="flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-warning"
                  title="Pendiente de sincronización"
                >
                  <CloudUpload className="h-3 w-3" />
                  SYNC
                </span>
              )}
              <span
                className="status-badge"
                style={{ backgroundColor: `${status.color}20`, color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </div>

          <h3 className="mt-2 font-semibold text-foreground text-sm">{ek?.name ?? 'Emergencia'}</h3>

          {/* Flag indicators */}
          {flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flags.map(f => (
                <span key={f.label} className={`flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold ${f.color}`}>
                  <f.icon className="h-3 w-3" />
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{emergency.address}</span>
            </div>
            {emergency.caller_phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{emergency.caller_phone}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <Truck className="h-3.5 w-3.5 text-info" />
              <span className="font-mono font-medium text-foreground">{emergency.vehicleCodes.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-warning" />
              <span className="font-mono font-medium text-foreground">{emergency.personnelCount}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-emergency" />
              <span className="font-mono font-bold text-emergency">{timer}</span>
            </div>
          </div>

          {emergency.vehicleCodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {emergency.vehicleCodes.map(v => (
                <span key={v} className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {v}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            {/* Actions button */}
            <button
              onClick={() => setShowActions(true)}
              className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" /> Acciones
            </button>

            {/* PDF download */}
            <EmergencyPdfDownload emergencyId={emergency.id} folio={emergency.folio} />

            {/* Advance status */}
            {nextStatus && onAdvanceStatus && (
              <button
                onClick={() => onAdvanceStatus(emergency.id, nextStatus)}
                className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                → {statusConfig[nextStatus]?.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {showActions && (
        <EmergencyActionsPanel
          emergency={emergency}
          assignedVehicleIds={emergency.vehicleIds}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  );
}
