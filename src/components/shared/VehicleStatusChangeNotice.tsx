import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KEY = 'operix.notice.vehicle-assigned-status.v1';

export default function VehicleStatusChangeNotice() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(KEY) !== '1'; } catch { return true; }
  });
  if (!open) return null;
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setOpen(false); };
  return (
    <div role="status" className="fixed bottom-4 right-4 z-[55] w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-primary/40 bg-card p-4 text-sm text-card-foreground shadow-xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4 text-primary" />Cambio en estados de móviles</div>
        <button aria-label="Cerrar aviso" onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
        <li>Al despachar, los móviles quedan <b className="text-foreground">«Asignado»</b> (en cuartel).</li>
        <li>Pasan a <b className="text-foreground">6-0 Despachado</b> al tocarlos en la tarjeta o cuando la unidad reporta salida.</li>
        <li>Un móvil que nunca salió no pide conductor ni oficial al finalizar.</li>
      </ul>
      <Button size="sm" className="mt-3 w-full" onClick={close}>Entendido</Button>
    </div>
  );
}
