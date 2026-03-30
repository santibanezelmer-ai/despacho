import { BarChart3, Siren, Truck, Users, Clock } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [emergenciesRes, vehiclesRes, volunteersRes, activeRes] = await Promise.all([
        supabase.from('emergencies').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('vehicles').select('id, status'),
        supabase.from('volunteers').select('id', { count: 'exact', head: true }).eq('status', 'activo'),
        supabase.from('emergencies').select('id', { count: 'exact', head: true }).neq('status', 'finalizada'),
      ]);

      const vehicleData = vehiclesRes.data ?? [];
      const activeVehicles = vehicleData.filter(v => v.status === 'en_servicio').length;

      return {
        monthEmergencies: emergenciesRes.count ?? 0,
        activeVehicles,
        totalVehicles: vehicleData.length,
        activeVolunteers: volunteersRes.count ?? 0,
        activeEmergencies: activeRes.count ?? 0,
      };
    },
  });

  // Fetch emergency type breakdown
  const { data: typeData } = useQuery({
    queryKey: ['dashboard-types'],
    queryFn: async () => {
      const { data } = await supabase
        .from('emergencies')
        .select('emergency_key_id, emergency_keys(name, color)')
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

      const counts: Record<string, { name: string; value: number; color: string }> = {};
      (data ?? []).forEach((e: any) => {
        const name = e.emergency_keys?.name ?? 'Otro';
        const color = e.emergency_keys?.color ?? 'hsl(220, 14%, 40%)';
        if (!counts[name]) counts[name] = { name, value: 0, color };
        counts[name].value++;
      });
      return Object.values(counts);
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-info" />
        Dashboard Operativo
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Emergencias (Mes)" value={stats?.monthEmergencies ?? 0} icon={Siren} color="hsl(0, 85%, 55%)" />
        <StatsCard title="Móviles Activos" value={stats?.activeVehicles ?? 0} subtitle={`de ${stats?.totalVehicles ?? 0} total`} icon={Truck} color="hsl(145, 65%, 42%)" />
        <StatsCard title="Voluntarios Activos" value={stats?.activeVolunteers ?? 0} icon={Users} color="hsl(35, 95%, 55%)" />
        <StatsCard title="Emergencias Activas" value={stats?.activeEmergencies ?? 0} icon={Clock} color="hsl(210, 85%, 55%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - types */}
        <div className="console-panel p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tipos de Emergencia (Año)</h3>
          {(typeData ?? []).length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                    {(typeData ?? []).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 22%)', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {(typeData ?? []).map(t => (
                  <div key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name} ({t.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
              Sin datos de emergencias aún
            </div>
          )}
        </div>

        {/* Stats summary */}
        <div className="console-panel p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Resumen Operativo</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Emergencias este mes</span>
              <span className="text-lg font-mono font-bold text-foreground">{stats?.monthEmergencies ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Móviles en servicio</span>
              <span className="text-lg font-mono font-bold text-emergency">{stats?.activeVehicles ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Voluntarios activos</span>
              <span className="text-lg font-mono font-bold text-success">{stats?.activeVolunteers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Emergencias activas ahora</span>
              <span className="text-lg font-mono font-bold text-warning">{stats?.activeEmergencies ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
