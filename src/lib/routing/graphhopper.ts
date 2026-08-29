/**
 * Capa de ruteo preparada para GraphHopper.
 *
 * Aún no está habilitada: la implementación real debe llamar a una Edge Function
 * (`graphhopper-route`) que guarde la API key del lado del servidor. Este módulo
 * define los contratos para cálculo de rutas, distancia, ETA y comparación de
 * móviles frente a una emergencia, de modo que el resto de la app pueda
 * integrarse sin cambios cuando se active.
 */

export type LatLng = { lat: number; lng: number };

export type RouteProfile = 'car' | 'truck' | 'foot';

export type RouteResult = {
  /** Distancia total en metros. */
  distanceMeters: number;
  /** Tiempo estimado de llegada en segundos. */
  etaSeconds: number;
  /** Geometría de la ruta para dibujar en Leaflet (lat/lng). */
  points: LatLng[];
};

export type VehicleRouteComparison = {
  vehicleId: string;
  vehicleCode: string;
  route: RouteResult | null;
  error?: string;
};

export type RoutingProvider = {
  readonly name: string;
  isEnabled(): boolean;
  getRoute(from: LatLng, to: LatLng, profile?: RouteProfile): Promise<RouteResult>;
  compareVehicles(
    vehicles: Array<{ id: string; code: string; position: LatLng }>,
    emergency: LatLng,
    profile?: RouteProfile
  ): Promise<VehicleRouteComparison[]>;
};

export class RoutingNotConfiguredError extends Error {
  constructor() {
    super('GraphHopper aún no está configurado en este proyecto.');
    this.name = 'RoutingNotConfiguredError';
  }
}

/** Proveedor por defecto: inactivo hasta configurar GraphHopper. */
export const graphHopperProvider: RoutingProvider = {
  name: 'graphhopper',
  isEnabled: () => false,
  async getRoute() {
    throw new RoutingNotConfiguredError();
  },
  async compareVehicles(vehicles) {
    return vehicles.map((v) => ({
      vehicleId: v.id,
      vehicleCode: v.code,
      route: null,
      error: 'GraphHopper no configurado',
    }));
  },
};

/** Distancia haversine en metros: fallback mientras no hay ruteo real. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatEta(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
