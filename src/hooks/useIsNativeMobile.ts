import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside a Capacitor native shell (APK / IPA)
 * OR when the viewport is mobile-sized (< 768px).
 * Used to auto-redirect to the mobile experience.
 */
export function useIsNativeMobile(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window !== 'undefined' && window.innerWidth < 768) return true;
  return false;
}
