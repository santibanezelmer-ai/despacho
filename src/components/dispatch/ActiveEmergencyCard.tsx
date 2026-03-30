import { useEffect, useState } from 'react';
import { MapPin, Phone, Truck, Users, Clock } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  despacho: { label: 'DESPACHO', color: 'hsl(270, 60%, 55%)' },
  en_ruta: { label: 'EN RUTA', color: 'hsl(35, 95%, 55%)' },
  en_trabajo: { label: 'EN TRABAJO', color: 'hsl(0, 85%, 55%)' },
  controlada: { label: 'CONTROLADA', color: 'hsl(210, 85%, 55%)' },
  finalizada: { label: 'FINALIZADA', color: 'hsl(145, 65%, 42%)' },
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
    emergency_keys: { code: string; name: string; color: string } | null;
    vehicleCodes: string[];
    personnelCount: number;
  };
  onAdvanceStatus?: (id: string, newStatus: string) => void;
}

const STATUS_ORDER = ['despacho', 'en_ruta', 'en_trabajo', 'controlada', 'finalizada'];

export default function ActiveEmergencyCard({ emergency, onAdvanceStatus }: EmergencyCardProps) {
  const timer = useTimer(emergency.created_at);
  const ek = emergency.emergency_keys;
  const status = statusConfig[emergency.status] ?? statusConfig.despacho;
  const currentIdx = STATUS_ORDER.indexOf(emergency.status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;

  return (
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
          <span
            className="status-badge"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        <h3 className="mt-2 font-semibold text-foreground text-sm">{ek?.name ?? 'Emergencia'}</h3>

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

        {nextStatus && onAdvanceStatus && (
          <button
            onClick={() => onAdvanceStatus(emergency.id, nextStatus)}
            className="mt-3 w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Avanzar a → {statusConfig[nextStatus]?.label}
          </button>
        )}
      </div>
    </div>
  );
}
