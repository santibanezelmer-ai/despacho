import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ChevronRight } from 'lucide-react';

interface Props { organizationId: string }

export default function VoluntarioHistory({ organizationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['vol-history', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('id, folio, address, status, created_at, finished_at, emergency_keys(code, name, color)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-4 py-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4">Historial</h1>
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>
      ) : !data?.length ? (
        <p className="text-center text-muted-foreground text-sm py-10">Sin registros.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((e: any) => (
            <li key={e.id}>
              <Link to={`/voluntario/emergencia/${e.id}`} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 active:scale-[0.98] transition-transform">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-white text-xs font-bold"
                  style={{ backgroundColor: e.emergency_keys?.color || '#64748b' }}
                >{e.emergency_keys?.code || '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{e.emergency_keys?.name || 'Emergencia'}</p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{e.address}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{e.folio} · {new Date(e.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
