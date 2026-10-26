import { it, expect } from 'vitest';
import { resolveRouteKm, findNearestRouteKm, parseRouteKmQuery } from '@/lib/routeKilometer';
it('roundtrip', async () => {
  for (const [c,k] of [['U-485',8],['CH-215',30],['U-55-V',20]] as const) {
    const f:any = await resolveRouteKm({routeCode:c,kilometer:k});
    const n = await findNearestRouteKm(f.latitude, f.longitude);
    console.log(c, k, n?.routeCode, n?.kilometer, n?.distanceM);
    expect(n?.routeCode).toBe(c);
  }
  expect(parseRouteKmQuery('ruta U-981-T km 10')?.routeCode).toBe('U-981-T');
  expect(parseRouteKmQuery('ruta 215 km 30')?.routeCode).toBe('CH-215');
});
