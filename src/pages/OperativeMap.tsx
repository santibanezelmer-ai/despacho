import { useMemo, useState } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flame, Droplets, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import LeafletMapCanvas, { type MapEmergency, type MapHydrant } from '@/components/map/LeafletMapCanvas';

function useHydrants() {
  return useQuery({
    queryKey: ['hydrants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hydrants').select('*').eq('active', true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const statusLabels: Record<string, string> = {
  despacho: 'DESPACHO',
  en_ruta: 'EN RUTA',
  en_trabajo: 'EN TRABAJO',
  controlada: 'CONTROLADA',
};

export default function OperativeMap() {
  const { data: emergencies } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const [showHydrants, setShowHydrants] = useState(true);
  const [showEmergencies, setShowEmergencies] = useState(true);
  const [compatibilityMode, setCompatibilityMode] = useState(false);

  const mapEmergencies = useMemo<MapEmergency[]>(
    () =>
      (emergencies ?? [])
        .filter((e) => e.latitude != null && e.longitude != null)
        .map((e) => ({
          id: e.id,
          latitude: e.latitude!,
          longitude: e.longitude!,
          code: e.emergency_keys?.code ?? 'S/C',
          name: e.emergency_keys?.name ?? 'Sin clave',
          folio: e.folio,
          address: e.address,
          statusLabel: statusLabels[e.status] ?? e.status,
          statusColor: e.emergency_keys?.color ?? 'hsl(var(--emergency))',
          color: e.emergency_keys?.color ?? '#dc2626',
          vehicleCodes: e.vehicleCodes,
        })),
    [emergencies]
  );

  const mapHydrants = useMemo<MapHydrant[]>(
    () =>
      (hydrants ?? []).map((h) => ({
        id: h.id,
        latitude: h.latitude,
        longitude: h.longitude,
        name: h.name ?? 'Grifo',
        type: h.type,
        description: h.description,
      })),
    [hydrants]
  );

  return (
    <div className="flex w-full flex-col h-full" style={{ width: '100%' }}>
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Map className="h-5 w-5 text-info" /> Mapa Operativo
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showEmergencies} onCheckedChange={setShowEmergencies} id="show-emergencies" />
            <Label htmlFor="show-emergencies" className="text-xs flex items-center gap-1">
              <Flame className="h-3 w-3 text-emergency" /> Emergencias
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showHydrants} onCheckedChange={setShowHydrants} id="show-hydrants" />
            <Label htmlFor="show-hydrants" className="text-xs flex items-center gap-1">
              <Droplets className="h-3 w-3 text-info" /> Grifos
            </Label>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <LeafletMapCanvas
          emergencies={mapEmergencies}
          hydrants={mapHydrants}
          showEmergencies={showEmergencies}
          showHydrants={showHydrants}
          onCompatibilityModeChange={setCompatibilityMode}
        />

        {compatibilityMode && (
          <div className="absolute top-4 right-4 z-[1000] rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            Modo compatibilidad de mapa activo
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 z-[1000] space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Layers className="h-3 w-3" /> Leyenda
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-emergency border border-white" />
            Emergencia activa
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-info border border-white" />
            Grifo
          </div>
        </div>
      </div>
    </div>
  );
}
