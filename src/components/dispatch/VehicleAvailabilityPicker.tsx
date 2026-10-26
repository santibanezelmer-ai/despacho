import type { VehicleAvailability } from '@/lib/vehicleAvailability';

const kindClass: Record<VehicleAvailability['kind'], string> = {
  cuartel: 'text-success',
  reasignable_69: 'text-info',
  servicio_109: 'text-warning',
  bloqueado: 'text-muted-foreground',
  no_operativo: 'text-muted-foreground',
};

/** Lista de móviles con su disponibilidad y motivo. Los bloqueados se muestran deshabilitados. */
export default function VehicleAvailabilityPicker({
  items, selected, onToggle,
}: { items: VehicleAvailability[]; selected: string[]; onToggle: (id: string) => void }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No hay móviles registrados</p>;
  const sorted = [...items].sort((a, b) => Number(b.assignable) - Number(a.assignable) || a.code.localeCompare(b.code));
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map(v => {
        const isSel = selected.includes(v.id);
        return (
          <button
            key={v.id}
            type="button"
            disabled={!v.assignable}
            onClick={() => onToggle(v.id)}
            title={`${v.code} — ${v.label}`}
            className={`flex flex-col items-start rounded-md border px-3 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isSel
                ? 'border-emergency bg-emergency/20 text-emergency'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30'
            }`}
          >
            <span className="font-mono font-medium">{v.code} · {v.type}</span>
            {v.kind !== 'cuartel' && (
              <span className={`text-[10px] ${isSel ? '' : kindClass[v.kind]}`}>{v.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
