/**
 * Restricciones de acceso por rol (capa de interfaz).
 * El backend (RLS) ya impide escrituras a administradores de compañía:
 * `can_write_in_org` exige `company_id IS NULL`.
 *
 * Reglas específicas:
 * - Administrador por Compañía: no puede despachar; en "Sistema" solo Administración
 *   (ajustes de su compañía); mantiene Análisis y Recursos.
 * - Operador: acceso completo a Operaciones; en "Sistema" solo Pantalla Central;
 *   mantiene Análisis y Recursos.
 */

export type AccessRole = 'admin' | 'operador' | 'oficial' | 'visor' | 'voluntario' | null;

export interface AccessCtx {
  orgRole: AccessRole;
  isCompanyAdmin: boolean;
  isSuperadmin: boolean;
}

/** Rutas de la sección Sistema. */
const SYSTEM_PATHS = [
  '/pantalla-central',
  '/simulacion',
  '/alertas',
  '/claves',
  '/notificaciones',
  '/admin',
  '/admin/onboarding',
];

const DISPATCH_PATH = '/';

export function canAccessPath(path: string, ctx: AccessCtx): boolean {
  if (ctx.isSuperadmin) return true;

  if (ctx.isCompanyAdmin) {
    if (path === DISPATCH_PATH) return false;
    if (SYSTEM_PATHS.includes(path)) return path === '/admin';
    return true;
  }

  if (ctx.orgRole === 'operador') {
    if (SYSTEM_PATHS.includes(path)) return path === '/pantalla-central';
    return true;
  }

  return true;
}

/** Ruta por defecto cuando el usuario no puede acceder a la solicitada. */
export function defaultPathFor(ctx: AccessCtx): string {
  if (!ctx.isSuperadmin && ctx.isCompanyAdmin) return '/emergencias';
  return '/';
}

/** ¿Puede despachar emergencias? */
export function canDispatch(ctx: AccessCtx): boolean {
  return canAccessPath(DISPATCH_PATH, ctx);
}
