import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Archive, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import EmergencyPdfDownload from '@/components/dispatch/EmergencyPdfDownload';

export default function EmergencyHistory() {
  const { orgId } = useOrganization();
  const [search, setSearch] = useState('');

  const { data: emergencies, isLoading } = useQuery({
    queryKey: ['emergency-history', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('organization_id', orgId)
        .in('status', ['finalizada', 'en_cuartel'])
        .order('finished_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const filtered = (emergencies ?? []).filter(e =>
    !search ||
    e.folio?.toLowerCase().includes(search.toLowerCase()) ||
    e.address?.toLowerCase().includes(search.toLowerCase()) ||
    e.emergency_keys?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          Historial de Emergencias
        </h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por folio, dirección o clave..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-muted/50"
        />
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
                      <EmergencyPdfDownload emergencyId={e.id} folio={e.folio} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
