import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Crosshair, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Se llama con las coordenadas válidas ingresadas manualmente. */
  onSubmit: (lat: number, lng: number) => void;
  latitude?: number | null;
  longitude?: number | null;
}

/** Parsea "lat, lng" o "lat lng" pegado desde Google Maps. */
function parsePair(value: string): [string, string] | null {
  const parts = value.split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 2) return [parts[0], parts[1]];
  return null;
}

/** Ingreso manual de coordenadas, complementario a la búsqueda por dirección o enlace GPS. */
export default function ManualCoordsInput({ onSubmit, latitude, longitude }: Props) {
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState(latitude != null ? String(latitude) : '');
  const [lng, setLng] = useState(longitude != null ? String(longitude) : '');

  const handleLatChange = (value: string) => {
    const pair = parsePair(value);
    if (pair) {
      setLat(pair[0]);
      setLng(pair[1]);
      return;
    }
    setLat(value);
  };

  const handleApply = () => {
    const nLat = Number(lat.trim().replace(',', '.'));
    const nLng = Number(lng.trim().replace(',', '.'));
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      toast.error('Coordenadas inválidas');
      return;
    }
    if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      toast.error('Latitud debe estar entre -90 y 90, longitud entre -180 y 180');
      return;
    }
    onSubmit(nLat, nLng);
  };

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" /> Ingresar coordenadas manualmente
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={lat}
              onChange={e => handleLatChange(e.target.value)}
              placeholder="Latitud (-33.4489)"
              inputMode="decimal"
              className="bg-background/60 font-mono text-xs"
            />
            <Input
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="Longitud (-70.6693)"
              inputMode="decimal"
              className="bg-background/60 font-mono text-xs"
            />
          </div>
          <Button type="button" size="sm" className="w-full text-xs" onClick={handleApply}>
            Usar estas coordenadas
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Puedes pegar "lat, lng" copiado desde Google Maps en el primer campo.
          </p>
        </div>
      )}
    </div>
  );
}
