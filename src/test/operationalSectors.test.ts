import { describe, it, expect } from 'vitest';
import { findSectorsAt, parseGeoJson, type OperationalSector } from '@/lib/operationalSectors';

const square: OperationalSector = {
  id: 's1', kind: 'sector', name: 'Rahue', code: 'C-1', color: '#fff', company_id: null, source: 'dibujo',
  polygons: [[[[-40.5, -73.2], [-40.5, -73.1], [-40.6, -73.1], [-40.6, -73.2]]]],
};

describe('sectores propios', () => {
  it('detecta el sector cuando el punto está dentro', () => {
    expect(findSectorsAt(-40.55, -73.15, [square]).map((s) => s.id)).toEqual(['s1']);
  });
  it('no detecta sector fuera del polígono', () => {
    expect(findSectorsAt(-40.7, -73.15, [square])).toEqual([]);
  });
  it('GeoJSON [lng,lat] se convierte a [lat,lng]', () => {
    const r = parseGeoJson(JSON.stringify({ type: 'Feature', properties: { name: 'X' }, geometry: { type: 'Polygon', coordinates: [[[-73.2, -40.5], [-73.1, -40.5], [-73.1, -40.6], [-73.2, -40.5]]] } }));
    expect(r[0].polygons[0][0][0]).toEqual([-40.5, -73.2]);
  });
});
