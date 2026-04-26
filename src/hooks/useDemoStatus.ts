import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface DemoStatus {
  isDemo: boolean;
  expiresAt: Date | null;
  daysLeft: number;
  expired: boolean;
  emergenciesUsed: number;
  maxEmergencies: number;
  durationDays: number;
  limitReached: boolean;
}

export function useDemoStatus() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.organization_id;
  const isDemo = !!(currentOrg?.organization as any)?.is_demo;
  const expiresAt = (currentOrg?.organization as any)?.demo_expires_at as string | null | undefined;

  return useQuery({
    queryKey: ["demo-status", orgId, isDemo, expiresAt],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<DemoStatus> => {
      const { data: settings } = await (supabase as any)
        .from("demo_settings")
        .select("duration_days, max_emergencies")
        .maybeSingle();

      const maxEmergencies = settings?.max_emergencies ?? 20;
      const durationDays = settings?.duration_days ?? 14;

      if (!isDemo || !orgId) {
        return {
          isDemo: false,
          expiresAt: null,
          daysLeft: 0,
          expired: false,
          emergenciesUsed: 0,
          maxEmergencies,
          durationDays,
          limitReached: false,
        };
      }

      const exp = expiresAt ? new Date(expiresAt) : null;
      const now = new Date();
      const expired = !!exp && exp.getTime() < now.getTime();
      const daysLeft = exp ? Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / 86_400_000)) : 0;

      const { count } = await supabase
        .from("emergencies")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const emergenciesUsed = count ?? 0;

      return {
        isDemo: true,
        expiresAt: exp,
        daysLeft,
        expired,
        emergenciesUsed,
        maxEmergencies,
        durationDays,
        limitReached: emergenciesUsed >= maxEmergencies,
      };
    },
  });
}
