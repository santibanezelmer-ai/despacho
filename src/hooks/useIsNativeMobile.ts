import { Capacitor } from '@capacitor/core';

/**
 * Returns true ONLY when running inside a Capacitor native shell (APK / IPA).
 * Browser viewport size is NOT considered — the desktop console should always
 * be accessible from any browser regardless of window width.
 */
export function useIsNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}
