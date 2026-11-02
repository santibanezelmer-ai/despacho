import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { MapPinned, Pencil, Trash2, Upload, Undo2, Check, X, Grid3x3, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOperationalSectors, useSaveSectors, useDeleteSector, type SectorInput } from '@/hooks/useOperationalSectors';
import { useCompanies } from '@/hooks/useCompanies';
import { parseSectorFile, sectorLabel, type OperationalSector, type Ring, type SectorKind } from '@/lib/operationalSectors';
import { renderSectorLayer } from '@/lib/sectorLayer';
import { useOrganization } from '@/contexts/OrganizationContext';

const COLORS = ['#22d3ee', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#3b82f6', '#ec4899', '#eab308'];
const NONE = '__none__';

type Form = { id?: string; kind: SectorKind; name: string; code: string; color: string; company_id: string | null; polygons: Ring[][]; source: string };
const emptyForm = (polygons: Ring[][] = []): Form => ({ kind: 'sector', name: '', code: '', color: COLORS[0], company_id: null, polygons, source: 'dibujo' });

export default function SectorsAdmin() {
  const { orgId } = useOrganization();
  const { data: sectors, isLoading } = useOperationalSectors();
  const { data: companies } = useCompanies() as { data?: { id: string; name: string; number?: number }[] };
  const save = useSaveSectors();
  const del = useDeleteSector();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<Ring>([]);
  const [form, setForm] = useState<Form | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-40.574, -73.133], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // Sectores guardados (se oculta el que se edita)
  const visible = useMemo(() => sectors.filter((s) => s.id !== form?.id), [sectors, form?.id]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = renderSectorLayer(visible).addTo(map);
    return () => { layer.remove(); };
  }, [visible]);

  // Encajar a los sectores la primera vez
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitted.current || !sectors.length) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(sectors.flatMap((s) => s.polygons.flatMap((p) => p[0]))), { padding: [30, 30] });
  }, [sectors]);

  // Clic para dibujar
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawing) return;
    const onClick = (e: L.LeafletMouseEvent) => setPoints((p) => [...p, [e.latlng.lat, e.latlng.lng]]);
    map.on('click', onClick);
    map.getContainer().style.cursor = 'crosshair';
    return () => { map.off('click', onClick); map.getContainer().style.cursor = ''; };
  }, [drawing]);

  // Vista previa del trazo / del formulario
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = L.layerGroup().addTo(map);
    const color = form?.color ?? '#f97316';
    if (drawing && points.length) {
      L.polyline(points.length > 2 ? [...points, points[0]] : points, { color, weight: 3, dashArray: '5 5' }).addTo(g);
      points.forEach((pt) => L.circleMarker(pt, { radius: 4, color, fillOpacity: 1 }).addTo(g));
    } else if (form?.polygons.length) {
      L.polygon(form.polygons as L.LatLngExpression[][][], { color, weight: 3, fillOpacity: 0.2 }).addTo(g);
    }
    return () => { g.remove(); };
  }, [points, drawing, form]);

  const startDraw = () => { setForm(null); setPoints([]); setDrawing(true); };
  const finishDraw = () => {
    if (points.length < 3) { toast.error('Marca al menos 3 puntos para formar el polígono.'); return; }
    setDrawing(false);
    setForm(emptyForm([[points]]));
    setPoints([]);
  };
  const cancelDraw = () => { setDrawing(false); setPoints([]); };

  const edit = (s: OperationalSector) => {
    setDrawing(false);
    setForm({ id: s.id, kind: s.kind, name: s.name, code: s.code ?? '', color: s.color, company_id: s.company_id, polygons: s.polygons, source: s.source });
    mapRef.current?.fitBounds(L.latLngBounds(s.polygons.flatMap((p) => p[0])), { padding: [40, 40] });
  };

  const submit = async () => {
    if (!form || !form.name.trim()) { toast.error('Ingresa un nombre.'); return; }
    const input: SectorInput = { ...form, name: form.name.trim(), code: form.code.trim() || null };
    try {
      await save.mutateAsync([input]);
      toast.success(form.id ? 'Sector actualizado' : 'Sector creado');
      setForm(null);
    } catch (e) { toast.error((e as Error).message || 'No se pudo guardar'); }
  };

  const remove = async (s: OperationalSector) => {
    if (!confirm(`¿Eliminar "${sectorLabel(s)}"?`)) return;
    try { await del.mutateAsync(s.id); if (form?.id === s.id) setForm(null); toast.success('Eliminado'); }
    catch (e) { toast.error((e as Error).message || 'No se pudo eliminar'); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const items = await parseSectorFile(file);
      if (!items.length) { toast.error('El archivo no contiene polígonos.'); return; }
      const kind: SectorKind = confirm(`Se encontraron ${items.length} polígonos.\n\nAceptar = importar como SECTORES\nCancelar = importar como CUADRANTES`) ? 'sector' : 'cuadrante';
      await save.mutateAsync(items.map((it, i) => ({
        kind, name: it.name, code: it.code, color: it.color && /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : COLORS[i % COLORS.length],
        company_id: null, polygons: it.polygons, source: file.name,
      })));
      fitted.current = false;
      toast.success(`${items.length} ${kind === 'sector' ? 'sectores' : 'cuadrantes'} importados`);
    } catch (e) { toast.error((e as Error).message || 'No se pudo leer el archivo'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const companyName = (id: string | null) => companies?.find((c) => c.id === id)?.name;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="flex w-full flex-col gap-3 overflow-y-auto border-b border-border bg-card p-4 lg:w-96 lg:border-b-0 lg:border-r">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground"><MapPinned className="h-5 w-5 text-info" /> Sectores y cuadrantes</h1>
          <p className="text-xs text-muted-foreground">Zonas propias del cuerpo. Se muestran en el Mapa Operativo (capa «Sectores») y se detectan al marcar una emergencia.</p>
        </div>

        {!orgId ? null : drawing ? (
          <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            <p className="font-semibold text-foreground">Dibujando · {points.length} puntos</p>
            <p className="text-xs text-muted-foreground">Haz clic en el mapa para marcar cada vértice del polígono.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={finishDraw}><Check className="mr-1 h-4 w-4" />Terminar</Button>
              <Button size="sm" variant="secondary" onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}><Undo2 className="mr-1 h-4 w-4" />Deshacer</Button>
              <Button size="sm" variant="ghost" onClick={cancelDraw}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : form ? (
          <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
            <p className="text-sm font-semibold text-foreground">{form.id ? 'Editar' : 'Nuevo'} {form.kind}</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as SectorKind })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[1200]"><SelectItem value="sector">Sector</SelectItem><SelectItem value="cuadrante">Cuadrante</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Código</Label><Input className="h-8" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="C-1" /></div>
            </div>
            <div><Label className="text-xs">Nombre *</Label><Input className="h-8" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sector Rahue" /></div>
            <div><Label className="text-xs">Compañía responsable</Label>
              <Select value={form.company_id ?? NONE} onValueChange={(v) => setForm({ ...form, company_id: v === NONE ? null : v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[1200]">
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {(companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Color</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setForm({ ...form, color: c })}
                    className={`h-6 w-6 rounded-full border-2 ${form.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={submit} disabled={save.isPending}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={startDraw}><PenLine className="mr-1 h-4 w-4" />Dibujar</Button>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={save.isPending}><Upload className="mr-1 h-4 w-4" />Importar</Button>
            <input ref={fileRef} type="file" accept=".kml,.kmz,.geojson,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <p className="col-span-2 text-[11px] text-muted-foreground">Importa KML/KMZ (Google Earth, My Maps) o GeoJSON (QGIS).</p>
          </div>
        )}

        <div className="space-y-1">
          {isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
          {!isLoading && !sectors.length && <p className="text-xs text-muted-foreground">Aún no hay sectores creados.</p>}
          {sectors.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${form?.id === s.id ? 'border-primary' : 'border-border'}`}>
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              {s.kind === 'cuadrante' ? <Grid3x3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <MapPinned className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{sectorLabel(s)}</p>
                {companyName(s.company_id) && <p className="truncate text-[11px] text-muted-foreground">{companyName(s.company_id)}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(s)} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(s)} aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </aside>
      <div className="relative min-h-[420px] flex-1" style={{ isolation: 'isolate' }}>
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
