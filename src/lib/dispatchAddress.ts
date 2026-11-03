import { isValidLatLng } from '@/lib/coords';

const PENDING_ADDRESS = 'Obteniendo dirección…';

/** Recover legacy drafts without treating a loading message as an address. */
export function usableDispatchAddress(
  address: string,
  fix: { latitude: number; longitude: number } | null,
): string {
  if (address.trim() !== PENDING_ADDRESS) return address;
  if (!fix || !isValidLatLng(fix.latitude, fix.longitude)) return '';
  return `${fix.latitude.toFixed(6)}, ${fix.longitude.toFixed(6)}`;
}