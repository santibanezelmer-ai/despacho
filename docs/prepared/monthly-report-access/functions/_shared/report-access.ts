export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
export function randomReportToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
export async function hashReportToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('invalid');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
}
export function reportAccessState(row: { expires_at: string; revoked_at: string | null } | null, now: Date) {
  if (!row) return 'invalid';
  if (row.revoked_at) return 'revoked';
  if (now.getTime() >= Date.parse(row.expires_at)) return 'expired';
  return 'active';
}
export function reportAccessLinks(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('invalid');
  // Fragments never reach hosting request logs or HTTP Referer headers.
  return { view: `https://operixdispatch.com/reportes/consulta#${token}`, pdf: `https://operixdispatch.com/reportes/consulta/descargar#${token}` };
}