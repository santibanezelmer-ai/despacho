import { Droplets, Gauge, MapPin, Ruler, CalendarDays, FileText, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HYDRANT_STATUS, formatHydrantLocation } from '@/lib/hydrants';
import type { MapHydrant } from './LeafletMapCanvas';

type Props = {
  hydrant: MapHydrant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (hydrant: MapHydrant) => void;
};

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 border-b border-border/60 pb-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default function HydrantDetailSheet({ hydrant, open, onOpenChange, onEdit }: Props) {
  if (!hydrant) return null;
  const status = HYDRANT_STATUS[hydrant.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary">
              <Droplets className="h-6 w-6 text-info" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">Grifo {hydrant.number || hydrant.name}</SheetTitle>
              <SheetDescription>{hydrant.isOwn ? 'Registro de la organización' : 'Registro nacional compartido'}</SheetDescription>
            </div>
          </div>
          <Badge className={`mt-3 w-fit ${status.className}`}>{status.label}</Badge>
        </SheetHeader>

        <div className="space-y-6 py-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Ruler className="h-4 w-4 text-info" /> Bocas y conexiones</h3>
            {hydrant.outlets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {hydrant.outlets.map((outlet, index) => (
                  <div key={outlet.id} className="rounded-md border border-info/40 bg-info/10 p-3">
                    <p className="text-xs text-muted-foreground">Boca {index + 1}</p>
                    <p className="mt-1 font-mono text-xl font-bold text-info">{outlet.diameterMm} mm</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Sin información de bocas</p>}
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <Gauge className="mb-2 h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Caudal</p>
              <p className="font-semibold text-foreground">{hydrant.flowLpm != null ? `${hydrant.flowLpm} L/min` : 'Sin información'}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <Gauge className="mb-2 h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Presión</p>
              <p className="font-semibold text-foreground">{hydrant.pressureBar != null ? `${hydrant.pressureBar} bar` : 'Sin información'}</p>
            </div>
          </section>

          <section className="space-y-3">
            <Datum label="ID / número" value={hydrant.number || 'Sin información'} />
            <Datum label="Tipo / modelo" value={hydrant.type || 'Sin información'} />
            <Datum label="Ubicación" value={hydrant.location || formatHydrantLocation(hydrant.latitude, hydrant.longitude)} />
            <Datum label="Coordenadas" value={formatHydrantLocation(hydrant.latitude, hydrant.longitude)} />
            <Datum label="Última inspección" value={hydrant.lastInspection ? new Intl.DateTimeFormat('es-CL').format(new Date(`${hydrant.lastInspection}T12:00:00`)) : 'Sin información'} />
            <Datum label="Observaciones" value={hydrant.observations || hydrant.description || 'Sin información'} />
            {hydrant.year != null && <Datum label="Año registrado" value={String(hydrant.year)} />}
            {hydrant.pipeDiameterMm != null && <Datum label="Diámetro de tubería" value={`${hydrant.pipeDiameterMm} mm`} />}
          </section>

          {hydrant.isOwn && onEdit && (
            <Button className="w-full gap-2" onClick={() => onEdit(hydrant)}>
              <Wrench className="h-4 w-4" /> Editar ficha del grifo
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}