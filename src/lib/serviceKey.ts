// Claves de salida autorizada / otros servicios (10-9 y similares).
// En estas salidas suele ir solo el conductor: el oficial a cargo es opcional
// y la responsabilidad queda en quien autorizó en el despacho.
const AUTHORIZED_SERVICE_TERMS = [
  'otros servicios',
  'otro servicio',
  'servicio especial',
  'servicios especiales',
  'traslado',
  'salida autorizada',
];

export function isAuthorizedServiceKey(key: { code?: string | null; name?: string | null } | null | undefined): boolean {
  if (!key) return false;
  const code = (key.code ?? '').replace(/\s/g, '').toLowerCase();
  if (code === '10-9' || code === '109') return true;
  const name = (key.name ?? '').toLowerCase();
  return AUTHORIZED_SERVICE_TERMS.some(term => name.includes(term));
}

/** Roles de tripulación faltantes para cerrar un móvil. */
export function missingCrewRoles(roles: (string | null)[], serviceKey: boolean): string[] {
  const missing: string[] = [];
  if (!roles.includes('conductor')) missing.push('Conductor');
  if (!serviceKey && !roles.includes('oficial_a_cargo')) missing.push('Oficial a Cargo');
  return missing;
}
