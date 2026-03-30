import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Search, CheckCircle, XCircle, Pause, Play, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'text-success' },
  pending: { label: 'Pendiente', color: 'text-warning' },
  suspended: { label: 'Suspendida', color: 'text-destructive' },
  rejected: { label: 'Rechazada', color: 'text-muted-foreground' },
};

export default function SuperadminOrganizations() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['superadmin-orgs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from('organizations').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['superadmin-orgs'] }); }
  };

  const filtered = (orgs ?? []).filter((o: any) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.commune ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (o.region ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Building2 className="h-5 w-5 text-info" /> Organizaciones
      </h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Comuna</th>
              <th className="px-4 py-3 text-left font-medium">Región</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              filtered.map((o: any) => {
                const st = statusConfig[o.status] ?? statusConfig.pending;
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.commune ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.region ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {o.status !== 'active' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={() => updateStatus(o.id, 'active')} title="Activar">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'active' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-warning" onClick={() => updateStatus(o.id, 'suspended')} title="Suspender">
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'suspended' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={() => updateStatus(o.id, 'active')} title="Reactivar">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => updateStatus(o.id, 'rejected')} title="Rechazar">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
