export type HydrantStatus = 'operativo' | 'observaciones' | 'averiado' | 'sin_informacion';

export type HydrantOutlet = {
  id: string;
  diameterMm: number;
};

export const HYDRANT_STATUS: Record<HydrantStatus, { label: string; color: string; className: string }> = {
  operativo: { label: 'Operativo', color: '#22c55e', className: 'bg-success text-success-foreground' },
  observaciones: { label: 'Con observaciones', color: '#f59e0b', className: 'bg-warning text-warning-foreground' },
  averiado: { label: 'Averiado / Fuera de servicio', color: '#dc2626', className: 'bg-destructive text-destructive-foreground' },
  sin_informacion: { label: 'Sin información', color: '#171717', className: 'bg-foreground text-background' },
};

export const isHydrantStatus = (value: string): value is HydrantStatus => value in HYDRANT_STATUS;

export function parseHydrantOutlets(value: unknown): HydrantOutlet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;
    const diameterMm = Number(record.diameterMm);
    if (!Number.isFinite(diameterMm) || diameterMm <= 0) return [];
    return [{ id: typeof record.id === 'string' ? record.id : `outlet-${index}`, diameterMm }];
  });
}

export function formatHydrantLocation(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}