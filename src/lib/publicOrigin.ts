const OFFICIAL_ORIGIN = 'https://operixdispatch.com';

/** Origin for links that are sent or shared (emails, WhatsApp, QR): always the official domain outside the editor preview. */
export function publicAppOrigin(): string {
  if (typeof window === 'undefined') return OFFICIAL_ORIGIN;
  const { hostname, origin, protocol } = window.location;
  if (hostname.startsWith('id-preview') || hostname.endsWith('lovableproject.com')) return origin;
  if (hostname.endsWith('lovable.app') || hostname === 'localhost' || protocol === 'capacitor:') return OFFICIAL_ORIGIN;
  return origin;
}
