/**
 * Acceso general a Operix Voluntario: cualquier miembro activo de una
 * organización (admin, operador, oficial, voluntario, visor). Los permisos
 * específicos siguen en rolePermissions y RLS.
 */
export type VolunteerAccessRole = 'admin' | 'operador' | 'oficial' | 'voluntario' | 'visor';

export interface VolunteerMembershipRow {
  organization_id: string;
  role: string;
  status: string;
  organizations?: { id: string; name: string; status: string; logo_url: string | null } | null;
}

export interface VolunteerRecord { pwa_enabled: boolean | null; status: string | null }

export const NO_ORG_MESSAGE = 'Esta cuenta no pertenece a ninguna organización activa.';
export const DISABLED_MESSAGE = 'Tu acceso a la app está deshabilitado. Contacta a tu administrador.';

const VALID_ROLES: string[] = ['admin', 'operador', 'oficial', 'voluntario', 'visor'];
const STAFF_ROLES: string[] = ['admin', 'operador', 'oficial'];

/** Elige la membresía activa, priorizando organizaciones activas. */
export function pickVolunteerMembership(rows: VolunteerMembershipRow[] | null | undefined): VolunteerMembershipRow | null {
  const valid = (rows ?? []).filter(r => r.status === 'active' && VALID_ROLES.includes(r.role));
  return valid.find(r => r.organizations?.status === 'active') ?? null;
}

/** Devuelve el mensaje de bloqueo, o null si puede entrar. */
export function volunteerRecordBlock(role: string, vol: VolunteerRecord | null | undefined): string | null {
  if (!vol) return null;
  if (STAFF_ROLES.includes(role)) return null;
  if (vol.pwa_enabled === false || vol.status !== 'activo') return DISABLED_MESSAGE;
  return null;
}
