import L from 'leaflet';

/**
 * Fuente de tiles única para todos los mapas operativos de Operix.
 *
 * - OpenStreetMap oficial: sin API key, estable para producción.
 * - El look oscuro se logra con un filtro CSS (`.operix-dark-tiles`), no con
 *   un proveedor externo, evitando errores de tipo "API KEY REQUIRED".
 */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const DARK_TILES_CLASS = 'operix-dark-tiles';

export type BaseTileLayerOptions = {
  /** Aplica el filtro oscuro al contenedor del mapa. Por defecto true. */
  dark?: boolean;
  maxZoom?: number;
  attribution?: string;
};

/** Crea y agrega la capa base estándar de Operix a un mapa Leaflet. */
export function addBaseTileLayer(
  map: L.Map,
  options: BaseTileLayerOptions = {}
): L.TileLayer {
  const { dark = true, maxZoom = 19, attribution = OSM_ATTRIBUTION } = options;

  if (dark) {
    map.getContainer().classList.add(DARK_TILES_CLASS);
  }

  return L.tileLayer(OSM_TILE_URL, { maxZoom, attribution }).addTo(map);
}
