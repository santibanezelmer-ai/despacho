import { BarChart3, Siren, Truck, Users, Clock, Activity } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const monthlyData = [
  { month: 'Ene', emergencias: 42 },
  { month: 'Feb', emergencias: 38 },
  { month: 'Mar', emergencias: 55 },
  { month: 'Abr', emergencias: 47 },
  { month: 'May', emergencias: 61 },
  { month: 'Jun', emergencias: 53 },
];

const typeData = [
  { name: 'Incendio', value: 35, color: 'hsl(0, 85%, 55%)' },
  { name: 'Rescate', value: 25, color: 'hsl(210, 85%, 55%)' },
  { name: 'HazMat', value: 10, color: 'hsl(55, 90%, 50%)' },
  { name: 'Médico', value: 20, color: 'hsl(145, 65%, 42%)' },
  { name: 'Otros', value: 10, color: 'hsl(220, 14%, 40%)' },
];

const responseTimeData = [
  { day: 'Lun', tiempo: 4.2 },
  { day: 'Mar', tiempo: 3.8 },
  { day: 'Mié', tiempo: 5.1 },
  { day: 'Jue', tiempo: 4.5 },
  { day: 'Vie', tiempo: 3.9 },
  { day: 'Sáb', tiempo: 4.8 },
  { day: 'Dom', tiempo: 5.5 },
];

export default function Dashboard() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-info" />
        Dashboard Operativo
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Emergencias (Mes)" value={53} icon={Siren} color="hsl(0, 85%, 55%)" trend={{ value: '12%', positive: false }} />
        <StatsCard title="Móviles Activos" value={7} subtitle="de 10 total" icon={Truck} color="hsl(145, 65%, 42%)" />
        <StatsCard title="Voluntarios Activos" value={85} icon={Users} color="hsl(35, 95%, 55%)" trend={{ value: '5%', positive: true }} />
        <StatsCard title="T. Respuesta Prom." value="4:32" subtitle="min:seg" icon={Clock} color="hsl(210, 85%, 55%)" trend={{ value: '8%', positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="console-panel p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Emergencias por Mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 22%)', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="emergencias" fill="hsl(0, 85%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="console-panel p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tipos de Emergencia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {typeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 22%)', borderRadius: '8px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {typeData.map(t => (
              <div key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </div>
            ))}
          </div>
        </div>

        {/* Line chart */}
        <div className="console-panel p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tiempo de Respuesta (min) — Última Semana</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={responseTimeData}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 22%)', borderRadius: '8px', color: '#fff' }}
              />
              <Line type="monotone" dataKey="tiempo" stroke="hsl(210, 85%, 55%)" strokeWidth={2} dot={{ fill: 'hsl(210, 85%, 55%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
