import { useEffect, useState } from 'react';
import { MapPinned, TriangleAlert } from 'lucide-react';
import { lookupTerritory, TERRITORY_SOURCE, type TerritoryResult } from '@/lib/territoryLookup';

/**
 * Cobertura territorial informativa (Fase 6). Se recalcula con cada coordenada nueva,
 * sin importar su origen. Independiente de la confianza geográfica de la ubicación.
 * Si se entregan las coordenadas registradas del cuerpo (homeLatitude/homeLongitude),
 * advierte cuando el punto cae fuera del territorio propio. Solo advierte, nunca bloquea.
 */
export default function TerritoryStatus({ latitude, longitude, homeLatitude, homeLongitude }: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  homeLatitude?: number | null;
  homeLongitude?: number | null;
}) {
  const valid = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const homeValid = homeLatitude != null && homeLongitude != null && Number.isFinite(homeLatitude) && Number.isFinite(homeLongitude);
  const [result, setResult] = useState<{ key: string; value: TerritoryResult; home: TerritoryResult | null } | null>(null);
  const key = valid ? `${latitude},${longitude}|${homeValid ? `${homeLatitude},${homeLongitude}` : ''}` : '';

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const homePromise = homeValid ? lookupTerritory(homeLatitude!, homeLongitude!) : Promise.resolve(null);
    Promise.all([lookupTerritory(latitude!, longitude!), homePromise])
      .then(([value, home]) => { if (!cancelled) setResult({ key, value, home }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!valid) return null;
  // Nunca mostrar un resultado de una coordenada anterior
  const r = result?.key === key ? result.value : null;
  const home = result?.key === key ? result.home : null;

  let territory = 'Calculando…';
  let status = '';
  let cls = 'border-border bg-background/60';
  if (r?.status === 'inside') {
    territory = r.territory.shortName; status = 'Dentro del territorio'; cls = 'border-success/40 bg-success/10';
  } else if (r?.status === 'outside') {
    territory = 'No identificado'; status = 'Fuera de los territorios definidos'; cls = 'border-warning/40 bg-warning/10';
  } else if (r?.status === 'boundary') {
    territory = r.territories.map((t) => t.shortName).join(' / '); status = 'Sobre el límite territorial'; cls = 'border-warning/40 bg-warning/10';
  } else if (r?.status === 'overlap') {
    territory = r.territories.map((t) => t.shortName).join(' / '); status = 'En zona compartida por más de un territorio'; cls = 'border-warning/40 bg-warning/10';
  }

  // Territorio propio del cuerpo (según su ubicación registrada) y advertencia si el punto cae fuera de él
  const homeNames = home && home.status !== 'outside'
    ? (home.status === 'inside' ? [home.territory.shortName] : home.territories.map((t) => t.shortName))
    : null;
  const pointNames = r && r.status !== 'outside'
    ? (r.status === 'inside' ? [r.territory.shortName] : r.territories.map((t) => t.shortName))
    : [];
  const outsideOwn = !!homeNames && !!r && !pointNames.some((n) => homeNames.includes(n));
  if (outsideOwn) cls = 'border-warning/40 bg-warning/10';

  return (
    <div className={`rounded-md border p-2 text-[11px] text-foreground ${cls}`} data-testid="territory-status">
      <p className="mb-0.5 flex items-center gap-1 font-semibold"><MapPinned className="h-3.5 w-3.5" /> Cobertura territorial</p>
      <p>Territorio: <span className="font-semibold">{territory}</span></p>
      {status && <p>Estado: <span className="font-semibold">{status}</span></p>}
      {homeNames && (
        <p>Territorio del cuerpo: <span className="font-semibold">{homeNames.join(' / ')}</span></p>
      )}
      {outsideOwn && (
        <p className="mt-0.5 flex items-start gap-1 font-semibold text-warning">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          Fuera del territorio de tu cuerpo. Verifica la ubicación antes de despachar.
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">Fuente: {TERRITORY_SOURCE} · Informativo, no asigna recursos.</p>
    </div>
  );
}
