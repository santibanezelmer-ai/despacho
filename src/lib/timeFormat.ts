/**
 * Per-organization time format helpers (12h / 24h).
 * The preference lives in `organizations.time_format` ('12' | '24').
 */
export type TimeFormat = '12' | '24';

const LOCALE = 'es-CL';

export function isHour12(fmt: TimeFormat | null | undefined) {
  return fmt === '12';
}

/** HH:mm or hh:mm a.m. */
export function formatTime(value: string | number | Date | null | undefined, fmt: TimeFormat) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: isHour12(fmt),
  });
}

/** HH:mm:ss (clock displays) */
export function formatClock(value: string | number | Date, fmt: TimeFormat) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: isHour12(fmt),
  });
}

/** dd/MM/yyyy HH:mm */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fmt: TimeFormat,
  opts: { withYear?: boolean; withSeconds?: boolean } = {},
) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    ...(opts.withYear ? { year: 'numeric' as const } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(opts.withSeconds ? { second: '2-digit' as const } : {}),
    hour12: isHour12(fmt),
  });
}

/** date-fns pattern for the org preference, e.g. 'dd MMM HH:mm' vs 'dd MMM hh:mm a' */
export function timePattern(fmt: TimeFormat, withSeconds = false) {
  if (isHour12(fmt)) return withSeconds ? 'hh:mm:ss a' : 'hh:mm a';
  return withSeconds ? 'HH:mm:ss' : 'HH:mm';
}
