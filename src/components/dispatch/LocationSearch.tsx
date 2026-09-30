import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, MapPin, AlertTriangle, Ruler, CheckCircle2 } from 'lucide-react';
import { LANDMARK_TYPE_LABEL, type LandmarkType } from '@/lib/landmarks';
import { parseRouteKmQuery, resolveRouteKm, type RouteKmResult } from '@/lib/routeKilometer';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { resolveLocation, type LocationCandidate, type LocationConfidence } from '@/lib/locationResolver';

interface Props {
  initialQuery?: string;
  /** Se llama al elegir una sugerencia; el operador luego guarda con el flujo existente. */
  onSelect: (candidate: LocationCandidate) => void;
}

const CONF_META: Record<LocationConfidence, { label: string; cls: string }> = {
  high: { label: 'Alta', cls: 'border-success/50 bg-success/15 text-success' },
  medium: { label: 'Media', cls: 'border-warning/50 bg-warning/15 text-warning' },
  low: { label: 'Baja', cls: 'border-destructive/50 bg-destructive/15 text-destructive' },
};

const TYPE_LABEL: Record<string, string> = {
  calle: 'Calle', avenida: 'Avenida', pasaje: 'Pasaje', camino: 'Camino', ruta: 'Ruta',
  sector: 'Sector', localidad: 'Localidad', desconocido: 'Vía',
};

/** Buscador central de ubicaciones (Location Resolver) para la consola web. */
export default function LocationSearch({ initialQuery = '', onSelect }: Props) {
  const { orgId } = useOrganization();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocationCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LocationCandidate | null>(null);
  const [routeResult, setRouteResult] = useState<RouteKmResult | null>(null);
  const [routeSelected, setRouteSelected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { data: org } = useQuery({
    queryKey: ['org-geo-context', orgId],
    enabled: !!orgId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('organizations').select('commune, latitude, longitude').eq('id', orgId!).maybeSingle();
      return data;
    },
  });

  const handleSearch = async () => {
    if (query.trim().length < 3) { setError('Escribe al menos 3 letras'); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setSelected(null); setRouteResult(null); setRouteSelected(false);
    try {
      // Prioridad 1: Ruta + kilometraje → copia local Vialidad/MOP (sin consultas HTTP al MOP).
      const rk = parseRouteKmQuery(query);
      if (rk) {
        const r = await resolveRouteKm(rk);
        if (r.status !== 'unsupported_route') { setResults(null); setRouteResult(r); return; }
      }
      const list = await resolveLocation(query, {
        defaultContext: org?.commune ?? null,
        near: org?.latitude != null && org?.longitude != null ? { lat: org.latitude, lng: org.longitude } : null,
        signal: ctrl.signal,
      });
      setResults(list);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError('No se pudo consultar el buscador de mapas. Usa el mapa o las coordenadas manuales.');
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  };

  const choose = (c: LocationCandidate) => {
    setSelected(c);
    onSelect(c);
  };

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Search className="h-3.5 w-3.5" /> Buscar ubicación
      </label>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="Ej: Pasaje Los Aromos, Entre Lagos"
          className="min-w-0 flex-1 bg-background/60 text-xs"
          spellCheck
          lang="es-CL"
          autoCorrect="off"
        />
        <Button type="button" size="sm" onClick={handleSearch} disabled={loading} aria-label="Buscar ubicación">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Escribe la vía y, separado por coma, la comuna o localidad, una ruta y kilómetro (Ej: CH-215 km 55) o un puente (Ej: Puente Ñilque).{org?.commune ? ` Sin contexto se usa ${org.commune}.` : ''}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {routeResult && routeResult.status === 'found' && (
        <button
          type="button"
          onClick={() => {
            setRouteSelected(true);
            onSelect({
              id: `route-${routeResult.routeCode}-${routeResult.kilometer}`,
              label: `Ruta ${routeResult.routeCode} km ${routeResult.kilometer}`,
              secondary: routeResult.meta.name,
              latitude: routeResult.latitude, longitude: routeResult.longitude,
              type: 'ruta', street: `Ruta ${routeResult.routeCode}`, locality: null, commune: null, region: null,
              confidence: 'high', reason: 'Referencia kilométrica oficial de Vialidad/MOP.', source: 'vialidad',
            });
          }}
          className={`w-full rounded-md border p-2 text-left text-xs transition-colors ${routeSelected ? 'border-primary bg-primary/10' : 'border-success/50 bg-background/60 hover:border-primary/60'}`}
        >
          <p className="flex items-center gap-1.5 font-semibold text-foreground"><MapPin className="h-3.5 w-3.5 text-emergency" /> Ruta {routeResult.routeCode}</p>
          <p className="flex items-center gap-1.5 text-foreground"><Ruler className="h-3.5 w-3.5" /> Km {routeResult.kilometer}</p>
          <p className="flex items-center gap-1.5 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Ubicación encontrada</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Fuente: Vialidad/MOP · {routeResult.meta.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Confianza: <span className={`rounded border px-1.5 py-0.5 font-semibold ${CONF_META.high.cls}`}>Alta</span>
            {' '}· {routeResult.latitude.toFixed(5)}, {routeResult.longitude.toFixed(5)}
          </p>
          {routeSelected && (
            <p className="mt-1 text-[10px] text-muted-foreground">Revisa el marcador (puedes arrastrarlo) y presiona <b>Guardar ubicación</b>.</p>
          )}
        </button>
      )}

      {routeResult && routeResult.status === 'out_of_range' && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs">
          <p className="flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Kilómetro no encontrado</p>
          <p className="text-muted-foreground">
            La Ruta {routeResult.routeCode} va del km {routeResult.minKm} al km {routeResult.maxKm.toFixed(1)} según Vialidad/MOP. No se marcó ningún punto.
          </p>
        </div>
      )}

      {results && results.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">Sin resultados. Marca el punto en el mapa o ingresa coordenadas manualmente.</p>
      )}

      {results && results.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto" role="listbox" aria-label="Sugerencias de ubicación">
          {results.map(c => {
            const meta = CONF_META[c.confidence];
            const active = selected?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => choose(c)}
                  className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border bg-background/60 hover:border-primary/60'}`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emergency" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{c.label}</span>
                    {c.landmark ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Tipo: {LANDMARK_TYPE_LABEL[c.landmark.type as LandmarkType] ?? c.landmark.type}
                        {c.landmark.routeCode && <> · Ruta: {c.landmark.routeCode}</>}
                        {c.landmark.kilometer != null && <> · Km: {c.landmark.kilometer}</>}
                        <span className="block">✓ Ubicación encontrada · Fuente: {c.landmark.source === 'Dirección de Vialidad / MOP' ? 'Vialidad/MOP' : c.landmark.source}</span>
                      </span>
                    ) : (
                      <span className="block truncate text-[10px] text-muted-foreground">{TYPE_LABEL[c.type]} · {c.secondary}</span>
                    )}
                  </span>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className={`rounded-md border p-2 text-[11px] ${selected.confidence === 'low' ? 'border-destructive/50 bg-destructive/10' : 'border-border bg-background/60'}`}>
          {selected.confidence === 'low' && (
            <p className="mb-1 flex items-center gap-1 font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Ubicación aproximada
            </p>
          )}
          <p className="text-muted-foreground">{selected.reason}</p>
          <p className="mt-1 text-muted-foreground">
            Revisa el marcador en el mapa (puedes arrastrarlo) y presiona <b>Guardar ubicación</b> para confirmar.
          </p>
        </div>
      )}
    </div>
  );
}
