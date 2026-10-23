import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flame, Droplets, Layers, Plus, MousePointer2, LocateFixed, Building2, Truck, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LeafletMapCanvas, { type MapEmergency, type MapHydrant, type MapVehicle } from '@/components/map/LeafletMapCanvas';
import { useVehicleLastPositions, formatPositionAge, isPositionStale } from '@/hooks/useVehiclePositions';
import HydrantFormDialog from '@/components/map/HydrantFormDialog';
import LandmarkFormDialog from '@/components/map/LandmarkFormDialog';
import { useOrganizationLandmarks } from '@/hooks/useOrganizationLandmarks';
import type { LocalLandmark } from '@/lib/localLandmarks';
import { useHydrants, useSharedHydrants } from '@/hooks/useHydrantsData';
import { useStations } from '@/hooks/useStations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HydrantDetailSheet from '@/components/map/HydrantDetailSheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { TERRITORIAL_LAYERS, type TerritorialLayerId } from '@/lib/territorialLayers';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { isHydrantStatus, parseHydrantOutlets, type HydrantStatus } from '@/lib/hydrants';



const statusLabels: Record<string, string> = {
  despacho: 'DESPACHO',
  en_ruta: 'EN RUTA',
  en_trabajo: 'EN TRABAJO',
  controlada: 'CONTROLADA',
};

export default function OperativeMap({ screen = false }: { screen?: boolean }) {
  const { formatClock } = useTimeFormat();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!screen) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [screen]);
  const queryClient = useQueryClient();
  const { data: emergencies } = useActiveEmergencies();
  const { data: hydrants } = useHydrants();
  const stations = useStations();
  const { data: vehiclePositions } = useVehicleLastPositions({ refetchInterval: 10000 });
  const [showHydrants, setShowHydrants] = useState(true);
  const [showEmergencies, setShowEmergencies] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  // Capas territoriales: todas apagadas por defecto (mapa limpio)
  const [territorialLayers, setTerritorialLayers] = useState<TerritorialLayerId[]>([]);
  const toggleTerritorial = (id: TerritorialLayerId, on: boolean) =>
    setTerritorialLayers((prev) => (on ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));


  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [clickMode, setClickMode] = useState(false);
  const [clickTarget, setClickTarget] = useState<'hydrant' | 'landmark'>('hydrant');
  const [landmarkDialogOpen, setLandmarkDialogOpen] = useState(false);
  const [landmarkCoords, setLandmarkCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingLandmark, setEditingLandmark] = useState<LocalLandmark | null>(null);
  const { data: localLandmarks = [] } = useOrganizationLandmarks();
  const [hydrantDialogOpen, setHydrantDialogOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingHydrant, setEditingHydrant] = useState<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string | null;
    description: string | null;
    hydrantNumber: string | null;
    status: HydrantStatus;
    outlets: MapHydrant['outlets'];
    flowLpm: number | null;
    pressureBar: number | null;
    lastInspection: string | null;
    observations: string | null;
  } | null>(null);
  const [locateCounter, setLocateCounter] = useState(0);
  const [locating, setLocating] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; accuracy: number | null; ts: number } | null>(null);
  const [hydrantStatusFilter, setHydrantStatusFilter] = useState<HydrantStatus | 'all'>('all');
  const [hydrantDiameterFilter, setHydrantDiameterFilter] = useState<string>('all');
  const [selectedHydrant, setSelectedHydrant] = useState<MapHydrant | null>(null);
  const [hydrantDetailOpen, setHydrantDetailOpen] = useState(false);

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
          toast.success('Ubicación recibida correctamente.', { id: 'location-received' });
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
    setClickMode(false);
    if (clickTarget === 'landmark') {
      setEditingLandmark(null);
      setLandmarkCoords(latlng);
      setLandmarkDialogOpen(true);
      return;
    }
    setClickedCoords(latlng);
    setHydrantDialogOpen(true);
  }, [clickTarget]);

  const handleLandmarkEdit = useCallback((l: LocalLandmark) => {
    setEditingLandmark(l);
    setLandmarkCoords(null);
    setLandmarkDialogOpen(true);
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

  const editHydrant = useCallback((hydrant: MapHydrant) => {
    if (!hydrant.isOwn) return;
    setEditingHydrant({ id: hydrant.id, name: hydrant.name, lat: hydrant.latitude, lng: hydrant.longitude, type: hydrant.type, description: hydrant.description, hydrantNumber: hydrant.number, status: hydrant.status, outlets: hydrant.outlets, flowLpm: hydrant.flowLpm, pressureBar: hydrant.pressureBar, lastInspection: hydrant.lastInspection, observations: hydrant.observations });
    setClickedCoords({ lat: hydrant.latitude, lng: hydrant.longitude });
    setHydrantDetailOpen(false);
    setHydrantDialogOpen(true);
  }, []);

  const handleHydrantAction = useCallback(async (action: 'edit' | 'delete' | 'details', hydrant: MapHydrant) => {
    if (action === 'details') {
      setSelectedHydrant(hydrant);
      setHydrantDetailOpen(true);
      return;
    }
    if (action === 'delete') {
      if (!confirm('¿Eliminar este grifo?')) return;
      const { error } = await supabase.from('hydrants').delete().eq('id', hydrant.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Grifo eliminado');
      queryClient.invalidateQueries({ queryKey: ['hydrants'] });
    } else if (action === 'edit') {
      editHydrant(hydrant);
    }
  }, [editHydrant, queryClient]);

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
      number: h.hydrant_number,
      status: isHydrantStatus(h.status) ? h.status : 'sin_informacion',
      outlets: parseHydrantOutlets(h.outlets),
      flowLpm: h.flow_lpm,
      pressureBar: h.pressure_bar,
      location: h.name,
      lastInspection: h.last_inspection,
      observations: h.observations,
      pipeDiameterMm: null,
      year: null,
    }));
    const nationalHydrants = (sharedHydrants ?? []).map((h) => ({
      id: h.id,
      latitude: h.latitude,
      longitude: h.longitude,
      name: h.ubicacion ?? 'Grifo',
      type: h.modelo ?? null,
      description: h.anio ? `Año: ${h.anio}` + (h.diam_grifo ? ` | Diám. grifo: ${h.diam_grifo}mm` : '') + (h.diam_tub ? ` | Diám. tubo: ${h.diam_tub}mm` : '') : null,
      isOwn: false,
      number: h.grifo_id != null ? String(h.grifo_id) : null,
      status: 'sin_informacion' as const,
      outlets: h.diam_grifo ? [{ id: `shared-${h.id}-1`, diameterMm: Number(h.diam_grifo) }] : [],
      flowLpm: null,
      pressureBar: null,
      location: h.ubicacion ?? null,
      lastInspection: null,
      observations: null,
      pipeDiameterMm: h.diam_tub != null ? Number(h.diam_tub) : null,
      year: h.anio ?? null,
    }));
    return [...orgHydrants, ...nationalHydrants];
  }, [hydrants, sharedHydrants]);

  const hydrantDiameters = useMemo(() => Array.from(new Set(mapHydrants.flatMap((hydrant) => hydrant.outlets.map((outlet) => outlet.diameterMm)))).sort((a, b) => a - b), [mapHydrants]);
  const filteredHydrants = useMemo(() => mapHydrants.filter((hydrant) => {
    if (hydrantStatusFilter !== 'all' && hydrant.status !== hydrantStatusFilter) return false;
    if (hydrantDiameterFilter !== 'all' && !hydrant.outlets.some((outlet) => outlet.diameterMm === Number(hydrantDiameterFilter))) return false;
    return true;
  }), [mapHydrants, hydrantStatusFilter, hydrantDiameterFilter]);

  const mapVehicles = useMemo<MapVehicle[]>(
    () =>
      (vehiclePositions ?? [])
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          vehicleId: p.vehicle_id,
          code: p.vehicles?.code ?? 'Móvil',
          type: p.vehicles?.type ?? null,
          status: p.vehicles?.status ?? null,
          latitude: p.latitude,
          longitude: p.longitude,
          heading: p.heading,
          speed: p.speed,
          emergencyFolio: p.emergencies?.folio ?? null,
          hasEmergency: !!p.emergency_id,
          ageLabel: formatPositionAge(p.captured_at),
          stale: isPositionStale(p.captured_at),
        })),
    [vehiclePositions]
  );

  return (
    <div className={screen ? 'flex h-screen w-screen flex-col bg-background' : 'flex w-full flex-col h-full'} style={screen ? undefined : { width: '100%' }}>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Map className="h-5 w-5 text-info" /> Mapa Operativo
          {screen && (
            <>
              {(emergencies ?? []).length > 0 && (
                <span className="ml-2 text-xs font-bold text-emergency">{(emergencies ?? []).length} emergencia{(emergencies ?? []).length !== 1 ? 's' : ''}</span>
              )}
              <span className="ml-3 font-mono text-sm tabular-nums text-foreground">{formatClock(now)}</span>
            </>
          )}
        </h1>
        {showHydrants && (
          <span className="text-xs tabular-nums text-muted-foreground">{filteredHydrants.length} grifos visibles</span>
        )}
      </div>

      <div className="relative flex-1 min-h-0" style={{ isolation: 'isolate' }}>
        <LeafletMapCanvas
          emergencies={mapEmergencies}
          hydrants={filteredHydrants}
          stations={stations}
          vehicles={mapVehicles}
          showEmergencies={showEmergencies}
          showHydrants={showHydrants}
          showStations={showStations}
          showVehicles={showVehicles}

          onCompatibilityModeChange={setCompatibilityMode}
          onBoundsChange={handleBoundsChange}
          onMapClick={handleMapClick}
          clickMode={clickMode}
          onHydrantAction={handleHydrantAction}
          locateRequested={locateCounter}
          onLocateResult={handleLocateResult}
          liveLocation={liveLocation}
          territorialLayers={territorialLayers}
          landmarks={localLandmarks}
          onLandmarkEdit={screen ? undefined : handleLandmarkEdit}
        />

        {/* Floating controls (top-right) */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary" className="h-9 gap-2 shadow-lg border border-border">
                <Layers className="h-4 w-4" /> Capas
                {territorialLayers.length > 0 && <span className="tabular-nums text-xs">+{territorialLayers.length}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 z-[1100] p-3 space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Mostrar en el mapa</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'show-emergencies', checked: showEmergencies, set: setShowEmergencies, icon: <Flame className="h-3.5 w-3.5 text-emergency" />, label: 'Emergencias' },
                    { id: 'show-hydrants', checked: showHydrants, set: setShowHydrants, icon: <Droplets className="h-3.5 w-3.5 text-info" />, label: 'Grifos' },
                    { id: 'show-stations', checked: showStations, set: setShowStations, icon: <Building2 className="h-3.5 w-3.5 text-warning" />, label: 'Cuarteles' },
                    { id: 'show-vehicles', checked: showVehicles, set: setShowVehicles, icon: <Truck className="h-3.5 w-3.5 text-success" />, label: 'Móviles GPS' },
                  ].map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                      <Label htmlFor={t.id} className="text-xs flex items-center gap-1.5">{t.icon}{t.label}</Label>
                      <Switch checked={t.checked} onCheckedChange={t.set} id={t.id} />
                    </div>
                  ))}
                </div>
              </div>

              {showHydrants && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold text-foreground flex items-center gap-1">
                    <SlidersHorizontal className="h-3 w-3" /> Filtro de grifos
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={hydrantStatusFilter} onValueChange={(value) => setHydrantStatusFilter(value as HydrantStatus | 'all')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[1200]">
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="operativo">Operativos</SelectItem>
                        <SelectItem value="observaciones">Con observaciones</SelectItem>
                        <SelectItem value="averiado">Averiados</SelectItem>
                        <SelectItem value="sin_informacion">Sin información</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={hydrantDiameterFilter} onValueChange={setHydrantDiameterFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Diámetro" /></SelectTrigger>
                      <SelectContent className="z-[1200]">
                        <SelectItem value="all">Todos los diámetros</SelectItem>
                        {hydrantDiameters.map((diameter) => <SelectItem key={diameter} value={String(diameter)}>{diameter} mm</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Capas territoriales</p>
                <div className="space-y-2">
                  {TERRITORIAL_LAYERS.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                      <Checkbox
                        checked={territorialLayers.includes(l.id)}
                        onCheckedChange={(v) => toggleTerritorial(l.id, v === true)}
                        aria-label={l.label}
                      />
                      <span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[10px] text-muted-foreground">Fuente: Mapa Cobertura Territorial Prehospitalaria Prov. Osorno</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setTerritorialLayers([])} disabled={!territorialLayers.length}>
                    Apagar todo
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {!screen && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" className="h-9 gap-2 shadow-lg">
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 z-[1100] p-1.5">
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => { setClickTarget('hydrant'); setClickMode(true); }}>
                    <MousePointer2 className="h-3.5 w-3.5" /> Grifo en el mapa
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handleAddManual}>
                    <Droplets className="h-3.5 w-3.5" /> Grifo por coordenadas
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => { setClickTarget('landmark'); setClickMode(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Punto local
                  </Button>
                </PopoverContent>
              </Popover>
              <Button size="icon" variant="secondary" className="h-9 w-9 shadow-lg border border-border" onClick={handleLocate} disabled={locating} title="Mi ubicación" aria-label="Mi ubicación">
                <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
              </Button>
            </>
          )}
        </div>

        {clickMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-md border border-primary bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            {clickTarget === 'landmark' ? 'Haz clic en el mapa para guardar un punto local' : 'Haz clic en el mapa para colocar un grifo'}
            <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => setClickMode(false)}>Cancelar</Button>
          </div>
        )}

        {compatibilityMode && (
          <div className="absolute bottom-4 right-16 z-[1000] rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            Modo compatibilidad de mapa activo
          </div>
        )}

        {/* Legend (collapsible) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="absolute bottom-4 left-4 z-[1000] h-8 gap-1.5 text-xs shadow-lg border border-border">
              <Layers className="h-3.5 w-3.5" /> Leyenda
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 z-[1100] p-3 space-y-1.5">
            {[
              ['rounded-full bg-emergency', 'Emergencia activa'],
              ['rounded bg-success', 'Grifo operativo'],
              ['rounded bg-warning', 'Grifo con observaciones'],
              ['rounded bg-destructive', 'Grifo averiado'],
              ['rounded bg-foreground', 'Grifo sin información'],
              ['rounded bg-[#f59e0b]', 'Cuartel'],
              ['rounded bg-[#22c55e]', 'Móvil con GPS'],
              ['rounded bg-[#dc2626]', 'Móvil en emergencia'],
              ['rounded bg-[#6b7280]', 'GPS desactualizado'],
            ].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`w-3 h-3 border border-border ${cls}`} />
                {label}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <HydrantFormDialog
        open={hydrantDialogOpen}
        onOpenChange={(v) => { setHydrantDialogOpen(v); if (!v) setEditingHydrant(null); }}
        initialCoords={clickedCoords}
        editingHydrant={editingHydrant}
      />
      <HydrantDetailSheet hydrant={selectedHydrant} open={hydrantDetailOpen} onOpenChange={setHydrantDetailOpen} onEdit={editHydrant} />
      <LandmarkFormDialog open={landmarkDialogOpen} onOpenChange={setLandmarkDialogOpen} landmark={editingLandmark} position={landmarkCoords} />
    </div>
  );
}
