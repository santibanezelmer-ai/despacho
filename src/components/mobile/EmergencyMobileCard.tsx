import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmergencyCardProps {
  emergency: {
    id: string;
    folio: string;
    address: string;
    status: string;
    created_at: string;
    emergency_keys: { code: string; name: string; color: string } | null;
    vehicleCodes?: string[];
    personnelCount?: number;
  };
}

const statusLabels: Record<string, string> = {
  despacho: 'Despacho',
  en_ruta: 'En Ruta',
  en_trabajo: 'En Trabajo',
  controlada: 'Controlada',
  finalizada: 'Finalizada',
};

const statusClasses: Record<string, string> = {
  despacho: 'bg-[hsl(var(--status-despacho)/0.15)] text-[hsl(var(--status-despacho))] border-[hsl(var(--status-despacho)/0.3)]',
  en_ruta: 'bg-[hsl(var(--status-en-ruta)/0.15)] text-[hsl(var(--status-en-ruta))] border-[hsl(var(--status-en-ruta)/0.3)]',
  en_trabajo: 'bg-[hsl(var(--status-en-trabajo)/0.15)] text-[hsl(var(--status-en-trabajo))] border-[hsl(var(--status-en-trabajo)/0.3)]',
  controlada: 'bg-[hsl(var(--status-controlada)/0.15)] text-[hsl(var(--status-controlada))] border-[hsl(var(--status-controlada)/0.3)]',
  finalizada: 'bg-[hsl(var(--status-finalizada)/0.15)] text-[hsl(var(--status-finalizada))] border-[hsl(var(--status-finalizada)/0.3)]',
};

export default function EmergencyMobileCard({ emergency }: EmergencyCardProps) {
  const navigate = useNavigate();
  const isLive = emergency.status !== 'finalizada';
  const keyColor = emergency.emergency_keys?.color || '#dc2626';

  return (
    <button
      onClick={() => navigate(`/mobile/emergency/${emergency.id}`)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98]',
        'bg-card hover:bg-card/80 border-border',
        isLive && 'border-l-[3px]'
      )}
      style={isLive ? { borderLeftColor: keyColor } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Key + Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-white"
              style={{ backgroundColor: keyColor }}
            >
              {isLive && <Siren className="w-3 h-3" />}
              {emergency.emergency_keys?.code || '??'}
            </span>
            <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border', statusClasses[emergency.status] || '')}>
              {statusLabels[emergency.status] || emergency.status}
            </span>
            {emergency.folio && (
              <span className="text-[10px] text-muted-foreground font-mono">#{emergency.folio}</span>
            )}
          </div>

          {/* Name */}
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            {emergency.emergency_keys?.name || 'Emergencia'}
          </p>

          {/* Address */}
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{emergency.address}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(emergency.created_at), "dd MMM HH:mm", { locale: es })}
            </span>
            {emergency.vehicleCodes && emergency.vehicleCodes.length > 0 && (
              <span className="text-foreground/70">
                🚒 {emergency.vehicleCodes.slice(0, 3).join(', ')}
                {emergency.vehicleCodes.length > 3 && ` +${emergency.vehicleCodes.length - 3}`}
              </span>
            )}
            {(emergency.personnelCount ?? 0) > 0 && (
              <span className="text-foreground/70">👨‍🚒 {emergency.personnelCount}</span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}
