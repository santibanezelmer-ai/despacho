import { describe, it, expect } from 'vitest';
import { lookupTerritory, pointInTerritory } from '@/lib/territoryLookup';
import { loadTerritorialDataset } from '@/lib/territorialLayers';
import { parseRouteKmQuery, resolveRouteKm } from '@/lib/routeKilometer';
import { searchLandmarks } from '@/lib/landmarks';

const short = (r: Awaited<ReturnType<typeof lookupTerritory>>) =>
  r.status === 'inside' ? r.territory.shortName : r.status;

describe('Fase 6 — cobertura territorial', () => {
  it('Entre Lagos (plaza) → dentro de Entre Lagos', async () => {
    expect(short(await lookupTerritory(-40.6835, -72.5977))).toBe('Entre Lagos');
  });
  it('Puerto Montt → fuera de los territorios', async () => {
    expect((await lookupTerritory(-41.4693, -72.9424)).status).toBe('outside');
  });
  it('Centro de Osorno → otro territorio', async () => {
    const r = await lookupTerritory(-40.5739, -73.1335);
    expect(r.status).toBe('inside');
    expect(short(r)).not.toBe('Entre Lagos');
  });
  it('Punto sobre un vértice exacto del KML → sobre el límite', async () => {
    const ds = await loadTerritorialDataset();
    const el = ds.features.find((f) => f.name.includes('Entre Lagos'))!;
    const [lat, lng] = el.coordinates[0][0][10];
    expect((await lookupTerritory(lat, lng)).status).toBe('boundary');
  });
  it('Punto a ~1 m del límite no se considera "sobre el límite"', async () => {
    const ds = await loadTerritorialDataset();
    const el = ds.features.find((f) => f.name.includes('Entre Lagos'))!;
    const [lat, lng] = el.coordinates[0][0][10];
    const a = pointInTerritory(lat + 1e-5, lng, el.coordinates);
    const b = pointInTerritory(lat - 1e-5, lng, el.coordinates);
    expect([a, b]).not.toContain(-1);
  });
  it('CH-215 km 55', async () => {
    const r: any = await resolveRouteKm(parseRouteKmQuery('CH-215 km 55')!);
    const lat = r.latitude ?? r.point?.latitude, lng = r.longitude ?? r.point?.longitude;
    const t = await lookupTerritory(lat, lng);
    console.log('CH-215 km 55', lat, lng, JSON.stringify(t));
    expect(t.status).not.toBeUndefined();
  });
  it('Puente Ñilque', async () => {
    const m: any[] = await searchLandmarks('Puente Ñilque');
    for (const x of m) {
      const l = x.landmark ?? x;
      console.log('Ñilque', l.name, l.latitude, l.longitude, JSON.stringify(await lookupTerritory(l.latitude, l.longitude)));
    }
    expect(m.length).toBeGreaterThan(0);
  });
});
