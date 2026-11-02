import L from 'leaflet';
import { sectorLabel, type OperationalSector } from './operationalSectors';

export type OperationalSectorLayerInput = OperationalSector;

/** Polígonos de sectores propios con etiqueta; no interfieren con clics de marcadores. */
export function renderSectorLayer(sectors: OperationalSector[]): L.LayerGroup {
  const group = L.layerGroup();
  sectors.forEach((s) => {
    const isQ = s.kind === 'cuadrante';
    L.polygon(s.polygons as L.LatLngExpression[][][], {
      color: s.color,
      weight: isQ ? 1.5 : 2.5,
      dashArray: isQ ? '6 4' : undefined,
      fillColor: s.color,
      fillOpacity: isQ ? 0.05 : 0.1,
      interactive: false,
    })
      .bindTooltip(sectorLabel(s), { permanent: true, direction: 'center', className: 'sector-label' })
      .addTo(group);
  });
  return group;
}
