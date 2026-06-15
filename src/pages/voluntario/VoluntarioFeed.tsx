import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { organizationId: string }

const STATUS_COLORS: Record<string, string> = {
  despacho: 'bg-emergency/20 text-emergency',
  en_camino: 'bg-amber-500/20 text-amber-400',
  trabajando: 'bg-orange-500/20 text-orange-400',
  controlada: 'bg-blue-500/20 text-blue-400',
  finalizada: 'bg-muted text-muted-foreground',
};

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho',
  en_camino: 'En camino',
  trabajando: 'Trabajando',
  controlada: 'Controlada',
  finalizada: 'Finalizada',
};

export default function VoluntarioFeed({ organizationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['vol-feed', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('id, folio, address, status, dispatched_at, created_at, observations, latitude, longitude, emergency_keys(code, name, color)')
        .eq('organization_id', organizationId)
        .neq('status', 'finalizada')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="px-4 py-4 max-w-md mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Emergencias Activas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Recibirás una alerta por cada despacho nuevo</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>
      ) : !data?.length ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Sin emergencias activas en este momento.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((e: any) => (
            <li key={e.id}>
              <Link
                to={`/voluntario/emergencia/${e.id}`}
                className="block bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-bold text-white text-sm"
                    style={{ backgroundColor: e.emergency_keys?.color || '#dc2626' }}
                  >
                    {e.emergency_keys?.code || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{e.emergency_keys?.name || 'Emergencia'}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] || ''}`}>
                        {STATUS_LABEL[e.status] || e.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> <span className="line-clamp-2">{e.address}</span>
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(e.dispatched_at || e.created_at), { addSuffix: true, locale: es })}
                      </span>
                      <span className="font-mono">{e.folio}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
