import { useEffect, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { lookupTerritory, TERRITORY_SOURCE, type TerritoryResult } from '@/lib/territoryLookup';

/**
 * Cobertura territorial informativa (Fase 6). Se recalcula con cada coordenada nueva,
 * sin importar su origen. Independiente de la confianza geográfica de la ubicación.
 */
export default function TerritoryStatus({ latitude, longitude }: { latitude: number | null | undefined; longitude: number | null | undefined }) {
  const valid = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const [result, setResult] = useState<{ key: string; value: TerritoryResult } | null>(null);
  const key = valid ? `${latitude},${longitude}` : '';

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    lookupTerritory(latitude!, longitude!).then((value) => { if (!cancelled) setResult({ key, value }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!valid) return null;
  // Nunca mostrar un resultado de una coordenada anterior
  const r = result?.key === key ? result.value : null;

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

  return (
    <div className={`rounded-md border p-2 text-[11px] text-foreground ${cls}`} data-testid="territory-status">
      <p className="mb-0.5 flex items-center gap-1 font-semibold"><MapPinned className="h-3.5 w-3.5" /> Cobertura territorial</p>
      <p>Territorio: <span className="font-semibold">{territory}</span></p>
      {status && <p>Estado: <span className="font-semibold">{status}</span></p>}
      <p className="text-[10px] text-muted-foreground">Fuente: {TERRITORY_SOURCE} · Informativo, no asigna recursos.</p>
    </div>
  );
}
