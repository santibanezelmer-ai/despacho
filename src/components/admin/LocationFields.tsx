import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { geocodeAddress } from '@/lib/geocode';

type Props = {
  address: string;
  latitude: string;
  longitude: string;
  onChange: (patch: { address?: string; latitude?: string; longitude?: string }) => void;
  addressLabel?: string;
};

/** Dirección + coordenadas del cuartel, con búsqueda automática por dirección. */
export default function LocationFields({
  address,
  latitude,
  longitude,
  onChange,
  addressLabel = 'Dirección',
}: Props) {
  const [locating, setLocating] = useState(false);

  const handleGeocode = async () => {
    if (!address.trim()) { toast.error('Escribe una dirección primero'); return; }
    setLocating(true);
    const result = await geocodeAddress(address);
    setLocating(false);
    if (!result) { toast.error('No se encontraron coordenadas para esa dirección'); return; }
    onChange({ latitude: result.lat.toFixed(6), longitude: result.lng.toFixed(6) });
    toast.success('Coordenadas obtenidas');
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">{addressLabel}</Label>
        <Input
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          className="bg-muted/50"
          placeholder="Calle 123, Comuna, Región"
        />
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Latitud</Label>
          <Input
            value={latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
            className="bg-muted/50"
            placeholder="-33.4489"
          />
        </div>
        <div>
          <Label className="text-xs">Longitud</Label>
          <Input
            value={longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
            className="bg-muted/50"
            placeholder="-70.6693"
          />
        </div>
        <Button type="button" size="sm" variant="outline" className="h-9 text-xs gap-1" onClick={handleGeocode} disabled={locating}>
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Buscar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" /> Se muestra como cuartel en el mapa operativo. Las ubicaciones idénticas se agrupan en un solo marcador.
      </p>
    </div>
  );
}
