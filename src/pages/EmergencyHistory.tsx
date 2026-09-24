import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Archive, Search, Calendar, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import EmergencyPdfDownload from '@/components/dispatch/EmergencyPdfDownload';
import EditEmergencyDialog from '@/components/dispatch/EditEmergencyDialog';

export default function EmergencyHistory() {
  const { orgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

  const { data: emergencies, isLoading } = useQuery({
    queryKey: ['emergency-history', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('organization_id', orgId)
        .in('status', ['finalizada', 'en_cuartel'])
        .order('finished_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const filtered = (emergencies ?? []).filter(e => {
    if (search) {
      const s = search.toLowerCase();
      const match =
        e.folio?.toLowerCase().includes(s) ||
        e.address?.toLowerCase().includes(s) ||
        e.emergency_keys?.name?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (dateFrom || dateTo) {
      const d = new Date(e.finished_at || e.created_at);
      if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          Historial de Emergencias
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, dirección o clave..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-auto bg-muted/50"
            title="Desde"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-auto bg-muted/50"
            title="Hasta"
          />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="console-panel flex flex-col items-center justify-center py-16 text-center">
          <Archive className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No se encontraron emergencias finalizadas</p>
        </div>
      ) : (
        <div className="console-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="text-left py-2 px-3">Folio</th>
                <th className="text-left py-2 px-3">Clave</th>
                <th className="text-left py-2 px-3">Dirección</th>
                <th className="text-left py-2 px-3">Fecha</th>
                <th className="text-right py-2 px-3">Ficha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const ek = e.emergency_keys;
                return (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">{e.folio}</td>
                    <td className="py-2 px-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold"
                        style={{ backgroundColor: ek?.color ?? '#dc2626', color: '#fff' }}
                      >
                        {ek?.code ?? '—'}
                      </span>
                      <span className="ml-1.5 text-xs">{ek?.name ?? ''}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground truncate max-w-[200px]">{e.address}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                      {e.finished_at ? new Date(e.finished_at).toLocaleString('es-CL') : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar ficha"
                          onClick={() => setEditing(e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <EmergencyPdfDownload emergencyId={e.id} folio={e.folio} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditEmergencyDialog
          emergency={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
