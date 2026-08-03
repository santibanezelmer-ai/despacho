import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationOptional } from '@/contexts/OrganizationContext';
import {
  formatClock,
  formatDateTime,
  formatTime,
  timePattern,
  type TimeFormat,
} from '@/lib/timeFormat';

/**
 * Reads the current organization's 12h/24h preference and exposes
 * ready-to-use formatters. Defaults to 24h while loading.
 */
export function useTimeFormat(explicitOrgId?: string | null) {
  const ctx = useOrganizationOptional();
  const orgId = explicitOrgId ?? ctx?.orgId ?? null;

  const { data } = useQuery({
    queryKey: ['org-time-format', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('time_format')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data?.time_format as TimeFormat) ?? '24';
    },
  });

  const fmt: TimeFormat = data ?? '24';

  return {
    timeFormat: fmt,
    hour12: fmt === '12',
    formatTime: (v: string | number | Date | null | undefined) => formatTime(v, fmt),
    formatClock: (v: string | number | Date) => formatClock(v, fmt),
    formatDateTime: (
      v: string | number | Date | null | undefined,
      opts?: { withYear?: boolean; withSeconds?: boolean },
    ) => formatDateTime(v, fmt, opts),
    pattern: (withSeconds = false) => timePattern(fmt, withSeconds),
  };
}
