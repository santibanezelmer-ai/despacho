/**
 * Claves radiales de estado por móvil (uso interno de la consola de despacho).
 * La app móvil y la vista de voluntarios NO usan estas claves: allí se sigue
 * mostrando el estado general de la emergencia (despachada / en trabajo /
 * controlada / finalizada).
 */
export type VehicleOperationalStatus =
  | 'despachado'
  | 'en_lugar'
  | 'controlada'
  | 'disponible_lugar'
  | 'retirandose'
  | 'en_cuartel';

export interface VehicleStatusMeta {
  key: VehicleOperationalStatus;
  code: string;
  label: string;
  /** Texto radial completo, para tooltips y bitácora. */
  description: string;
  /** Clases Tailwind con tokens semánticos del tema. */
  chip: string;
  timestampField: 'assigned_at' | 'status_updated_at' | 'on_scene_at' | 'controlled_at' | 'withdrawing_at' | 'released_at';
}

export const VEHICLE_STATUS_META: Record<VehicleOperationalStatus, VehicleStatusMeta> = {
  despachado: {
    key: 'despachado',
    code: '6-0',
    label: 'Despachado',
    description: 'Material mayor despachado / en ruta',
    chip: 'border-warning/50 bg-warning/15 text-warning',
    timestampField: 'assigned_at',
  },
  en_lugar: {
    key: 'en_lugar',
    code: '6-3',
    label: 'En el lugar',
    description: 'Material mayor en el lugar de la emergencia',
    chip: 'border-emergency/50 bg-emergency/15 text-emergency',
    timestampField: 'on_scene_at',
  },
  controlada: {
    key: 'controlada',
    code: '6-7',
    label: 'Controlada',
    description: 'Situación controlada',
    chip: 'border-info/60 bg-info/20 text-info',
    timestampField: 'controlled_at',
  },
  disponible_lugar: {
    key: 'disponible_lugar',
    code: '6-8',
    label: 'Disponible',
    description: 'Material mayor disponible en el lugar',
    chip: 'border-info/50 bg-info/10 text-info',
    timestampField: 'status_updated_at',
  },
  retirandose: {
    key: 'retirandose',
    code: '6-9',
    label: 'Se retira',
    description: 'Material mayor se retira del lugar',
    chip: 'border-foreground/30 bg-muted text-foreground',
    timestampField: 'withdrawing_at',
  },
  en_cuartel: {
    key: 'en_cuartel',
    code: '6-10',
    label: 'En cuartel',
    description: 'Material mayor en cuartel',
    chip: 'border-success/50 bg-success/15 text-success',
    timestampField: 'released_at',
  },
};

/** Estados que el operador puede marcar directamente (6-10 exige kilometraje). */
export const SELECTABLE_VEHICLE_STATUSES: VehicleOperationalStatus[] = [
  'despachado',
  'en_lugar',
  'controlada',
  'disponible_lugar',
  'retirandose',
];

export function vehicleStatusMeta(status?: string | null): VehicleStatusMeta {
  return VEHICLE_STATUS_META[(status as VehicleOperationalStatus) ?? 'despachado']
    ?? VEHICLE_STATUS_META.despachado;
}

/** Clave radial reportada por Operix Móvil → estado operativo de la consola. */
export const MOBILE_KEY_TO_STATUS: Record<string, VehicleOperationalStatus> = {
  '6-3': 'en_lugar',
  '6-8': 'disponible_lugar',
  '6-9': 'retirandose',
  '6-10': 'en_cuartel',
};
