import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flame, Droplets, Layers, Plus, MousePointer2, LocateFixed, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LeafletMapCanvas, { type MapEmergency, type MapHydrant } from '@/components/map/LeafletMapCanvas';
import HydrantFormDialog from '@/components/map/HydrantFormDialog';
import { useHydrants, useSharedHydrants } from '@/hooks/useHydrantsData';
import { useStations } from '@/hooks/useStations';



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
  const [locateCounter, setLocateCounter] = useState(0);
  const [locating, setLocating] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; accuracy: number | null; ts: number } | null>(null);

  // Ubicación compartida por solicitantes: carga inicial + tiempo real
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('location_pings')
        .select('latitude, longitude, accuracy, captured_at')
        .gte('captured_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('captured_at', { ascending: false })
        .limit(1);
      const last = data?.[0];
      if (!cancelled && last) {
        setLiveLocation({
          lat: last.latitude,
          lng: last.longitude,
          accuracy: last.accuracy,
          ts: new Date(last.captured_at).getTime(),
        });
      }
    })();

    const channel = supabase
      .channel('operative-map-location-pings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_pings' },
        (payload) => {
          const row = payload.new as any;
          setLiveLocation({
            lat: row.latitude,
            lng: row.longitude,
            accuracy: row.accuracy ?? null,
            ts: new Date(row.captured_at ?? Date.now()).getTime(),
          });
          toast.success('Ubicación recibida correctamente.');
          queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


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

  const handleLocate = useCallback(() => {
    setLocating(true);
    setLocateCounter(c => c + 1);
  }, []);

  const handleLocateResult = useCallback((latlng: { lat: number; lng: number } | null) => {
    setLocating(false);
    if (!latlng) toast.error('No se pudo obtener tu ubicación');
  }, []);

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
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleLocate} disabled={locating}>
              <LocateFixed className={`h-3 w-3 ${locating ? 'animate-pulse' : ''}`} /> Mi ubicación
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0" style={{ isolation: 'isolate' }}>
        <LeafletMapCanvas
          emergencies={mapEmergencies}
          hydrants={mapHydrants}
          showEmergencies={showEmergencies}
          showHydrants={showHydrants}
          onCompatibilityModeChange={setCompatibilityMode}
          onBoundsChange={handleBoundsChange}
          onMapClick={handleMapClick}
          clickMode={clickMode}
          onHydrantAction={handleHydrantAction}
          locateRequested={locateCounter}
          onLocateResult={handleLocateResult}
          liveLocation={liveLocation}
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
        onOpenChange={(v) => { setHydrantDialogOpen(v); if (!v) setEditingHydrant(null); }}
        initialCoords={clickedCoords}
        editingHydrant={editingHydrant}
      />
    </div>
  );
}
