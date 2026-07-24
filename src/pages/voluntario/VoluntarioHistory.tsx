import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ChevronRight } from 'lucide-react';

interface Props { organizationId: string }

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho', en_camino: 'En camino', trabajando: 'Trabajando',
  controlada: 'Controlada', finalizada: 'Finalizada', en_cuartel: 'Finalizada',
};

function codeSize(code?: string | null) {
  const len = (code || '?').length;
  return len >= 7 ? 'text-[10px]' : len >= 6 ? 'text-xs' : len >= 5 ? 'text-sm' : len >= 4 ? 'text-base' : 'text-lg';
}

export default function VoluntarioHistory({ organizationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['vol-history-all', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('id, folio, address, status, created_at, finished_at, emergency_keys(code, name, color)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Group by date (es-CL)
  const groups: Record<string, any[]> = {};
  for (const e of data ?? []) {
    const d = new Date(e.finished_at || e.created_at);
    const key = d.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' });
    (groups[key] ||= []).push(e);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-cond">
        Registro operacional
      </div>
      <h1 className="text-4xl leading-none text-foreground mt-1">Historial</h1>
      <p className="text-xs text-muted-foreground mt-1.5 font-cond uppercase tracking-widest">Últimas {data?.length ?? 0} emergencias</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>
        ) : !data?.length ? (
          <p className="text-center text-muted-foreground text-sm py-16">Sin registros.</p>
        ) : (
          Object.entries(groups).map(([label, items]) => (
            <section key={label} className="mb-5">
              <h2 className="font-cond uppercase tracking-widest text-[10px] text-muted-foreground mb-2">{label}</h2>
              <ul className="space-y-1.5">
                {items.map((e: any) => (
                  <li key={e.id}>
                    <Link to={`/voluntario/emergencia/${e.id}`} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 active:scale-[0.98] transition-transform">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white font-display px-1 text-center leading-none ${codeSize(e.emergency_keys?.code)}`}
                        style={{ backgroundColor: e.emergency_keys?.color || '#404040' }}
                      >{e.emergency_keys?.code || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display uppercase text-base leading-none truncate text-foreground">{e.emergency_keys?.name || 'Emergencia'}</p>
                          <span className="ml-auto font-cond text-[9px] uppercase tracking-widest text-muted-foreground">{STATUS_LABEL[e.status] || e.status}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{e.address}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-cond uppercase tracking-widest">{new Date(e.finished_at || e.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
