import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

const DAY = 86_400_000;

/** Promedio despacho → primera llegada (6-3) de los últimos 30 días; si no hay, últimos 10 llamados. */
export function computeAvgResponse(rows: { start: string | null; arrival: string | null; created: string }[], now = Date.now()) {
  const valid = rows
    .map(r => ({ created: Date.parse(r.created), ms: r.start && r.arrival ? Date.parse(r.arrival) - Date.parse(r.start) : NaN }))
    .filter(r => Number.isFinite(r.ms) && r.ms > 0 && r.ms < 6 * 3600_000)
    .sort((a, b) => b.created - a.created);
  const recent = valid.filter(r => now - r.created <= 30 * DAY);
  const base = recent.length ? recent : valid.slice(0, 10);
  if (!base.length) return null;
  return { avgMs: base.reduce((s, r) => s + r.ms, 0) / base.length, count: base.length, window30d: recent.length > 0 };
}

export function formatMinSec(ms: number) {
  const t = Math.round(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')} min`;
}

export function useAvgResponseTime() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['avg-response-time', orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergencies')
        .select('created_at, dispatched_at, working_at, emergency_vehicles(on_scene_at)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return computeAvgResponse((data ?? []).map((e: any) => {
        const scenes = (e.emergency_vehicles ?? []).map((v: any) => v.on_scene_at).filter(Boolean).sort();
        return { start: e.dispatched_at ?? e.created_at, arrival: scenes[0] ?? e.working_at, created: e.created_at };
      }));
    },
  });
}
