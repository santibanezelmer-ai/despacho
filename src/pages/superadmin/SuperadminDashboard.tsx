import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, Siren, Clock, Loader2 } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';

export default function SuperadminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async () => {
      const [orgsRes, membersRes, emergenciesRes, requestsRes] = await Promise.all([
        (supabase as any).from('organizations').select('id, status'),
        (supabase as any).from('organization_members').select('id', { count: 'exact', head: true }),
        supabase.from('emergencies').select('id', { count: 'exact', head: true }),
        (supabase as any).from('organization_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const orgs = orgsRes.data ?? [];
      return {
        totalOrgs: orgs.length,
        activeOrgs: orgs.filter((o: any) => o.status === 'active').length,
        pendingOrgs: orgs.filter((o: any) => o.status === 'pending').length,
        totalUsers: membersRes.count ?? 0,
        totalEmergencies: emergenciesRes.count ?? 0,
        pendingRequests: requestsRes.count ?? 0,
      };
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Dashboard Global</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatsCard title="Organizaciones Activas" value={stats?.activeOrgs ?? 0} icon={Building2} color="hsl(145, 65%, 42%)" />
        <StatsCard title="Organizaciones Pendientes" value={stats?.pendingOrgs ?? 0} icon={Clock} color="hsl(35, 95%, 55%)" />
        <StatsCard title="Total Organizaciones" value={stats?.totalOrgs ?? 0} icon={Building2} color="hsl(210, 85%, 55%)" />
        <StatsCard title="Total Usuarios" value={stats?.totalUsers ?? 0} icon={Users} color="hsl(270, 60%, 55%)" />
        <StatsCard title="Total Emergencias" value={stats?.totalEmergencies ?? 0} icon={Siren} color="hsl(0, 85%, 55%)" />
        <StatsCard title="Solicitudes Pendientes" value={stats?.pendingRequests ?? 0} icon={Clock} color="hsl(35, 95%, 55%)" />
      </div>
    </div>
  );
}
