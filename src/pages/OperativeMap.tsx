import { useCallback, useMemo, useState } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flame, Droplets, Layers, Plus, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LeafletMapCanvas, { type MapEmergency, type MapHydrant } from '@/components/map/LeafletMapCanvas';
import HydrantFormDialog from '@/components/map/HydrantFormDialog';

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

function useSharedHydrants(bounds: { north: number; south: number; east: number; west: number } | null) {
  return useQuery({
    queryKey: ['shared-hydrants', bounds?.north, bounds?.south, bounds?.east, bounds?.west],
    queryFn: async () => {
      if (!bounds) return [];
      const { data, error } = await supabase
        .from('shared_hydrants' as any)
        .select('id, latitude, longitude, ubicacion, modelo, diam_grifo, diam_tub, anio')
        .eq('active', true)
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east)
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        latitude: number;
        longitude: number;
        ubicacion: string | null;
        modelo: string | null;
        diam_grifo: number | null;
        diam_tub: number | null;
        anio: number | null;
      }>;
    },
    enabled: !!bounds,
    staleTime: 30000,
  });
}

const statusLabels: Record<string, string> = {
  despacho: 'DESPACHO',
  en_ruta: 'EN RUTA',
  en_trabajo: 'EN TRABAJO',
  controlada: 'CONTROLADA',
};

export default function OperativeMap() {
  const queryClient = useQueryClient();
  const { data: emergencies } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const [showHydrants, setShowHydrants] = useState(true);
  const [showEmergencies, setShowEmergencies] = useState(true);
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [clickMode, setClickMode] = useState(false);
  const [hydrantDialogOpen, setHydrantDialogOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingHydrant, setEditingHydrant] = useState<{ id: string; name: string; lat: number; lng: number; type: string | null; description: string | null } | null>(null);

  const { data: sharedHydrants } = useSharedHydrants(mapBounds);

  const handleBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    setMapBounds(bounds);
  }, []);

  const handleMapClick = useCallback((latlng: { lat: number; lng: number }) => {
    setClickedCoords(latlng);
    setClickMode(false);
    setHydrantDialogOpen(true);
  }, []);

  const handleAddManual = () => {
    setEditingHydrant(null);
    setClickedCoords(null);
    setHydrantDialogOpen(true);
  };

  const handleHydrantAction = useCallback(async (action: 'edit' | 'delete', hydrant: MapHydrant) => {
    if (action === 'delete') {
      if (!confirm('¿Eliminar este grifo?')) return;
      const { error } = await supabase.from('hydrants').delete().eq('id', hydrant.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Grifo eliminado');
      queryClient.invalidateQueries({ queryKey: ['hydrants'] });
    } else if (action === 'edit') {
      setEditingHydrant({ id: hydrant.id, name: hydrant.name, lat: hydrant.latitude, lng: hydrant.longitude, type: hydrant.type, description: hydrant.description });
      setClickedCoords({ lat: hydrant.latitude, lng: hydrant.longitude });
      setHydrantDialogOpen(true);
    }
  }, [queryClient]);

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

  const mapHydrants = useMemo<MapHydrant[]>(() => {
    const orgHydrants = (hydrants ?? []).map((h) => ({
      id: h.id,
      latitude: h.latitude,
      longitude: h.longitude,
      name: h.name ?? 'Grifo',
      type: h.type,
      description: h.description,
      isOwn: true,
    }));
    const nationalHydrants = (sharedHydrants ?? []).map((h) => ({
      id: h.id,
      latitude: h.latitude,
      longitude: h.longitude,
      name: h.ubicacion ?? 'Grifo',
      type: h.modelo ?? null,
      description: h.anio ? `Año: ${h.anio}` + (h.diam_grifo ? ` | Diám. grifo: ${h.diam_grifo}mm` : '') + (h.diam_tub ? ` | Diám. tubo: ${h.diam_tub}mm` : '') : null,
      isOwn: false,
    }));
    return [...orgHydrants, ...nationalHydrants];
  }, [hydrants, sharedHydrants]);

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
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={clickMode ? 'default' : 'outline'}
              className="h-7 text-xs gap-1"
              onClick={() => setClickMode(!clickMode)}
            >
              <MousePointer2 className="h-3 w-3" />
              {clickMode ? 'Cancelar' : 'Colocar en mapa'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleAddManual}>
              <Plus className="h-3 w-3" /> Agregar grifo
            </Button>
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
          onBoundsChange={handleBoundsChange}
          onMapClick={handleMapClick}
          clickMode={clickMode}
        />

        {clickMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-md border border-primary bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            Haz clic en el mapa para colocar un grifo
          </div>
        )}

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

      <HydrantFormDialog
        open={hydrantDialogOpen}
        onOpenChange={setHydrantDialogOpen}
        initialCoords={clickedCoords}
      />
    </div>
  );
}
