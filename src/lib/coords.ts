/**
 * Validación de coordenadas geográficas antes de guardarlas.
 * No corrige ni normaliza: solo informa si el par es válido.
 * El mapa Leaflet no envuelve longitudes al dar la vuelta al mundo,
 * por lo que un arrastre con el mapa muy alejado puede producir
 * longitudes fuera de rango (ej. -344.6) que deben bloquearse.
 */

export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LAT_MIN &&
    lat <= LAT_MAX &&
    lng >= LNG_MIN &&
    lng <= LNG_MAX
  );
}

/** Mensaje claro para el operador cuando la coordenada está fuera de rango. */
export function coordRangeMessage(lat: number, lng: number): string {
  const problems: string[] = [];
  if (!Number.isFinite(lat) || lat < LAT_MIN || lat > LAT_MAX) {
    problems.push(`latitud ${Number.isFinite(lat) ? lat.toFixed(4) : 'inválida'} (debe estar entre -90 y 90)`);
  }
  if (!Number.isFinite(lng) || lng < LNG_MIN || lng > LNG_MAX) {
    problems.push(`longitud ${Number.isFinite(lng) ? lng.toFixed(4) : 'inválida'} (debe estar entre -180 y 180)`);
  }
  return `Coordenada fuera de rango: ${problems.join(' y ')}. Acerca el mapa y vuelve a ubicar el marcador.`;
}
