import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquareWarning, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SuperadminFeedback() {
  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ['superadmin-feedback'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('app_feedback')
        .select(`
          id, rating, had_errors, comments, app_version, created_at,
          organizations ( name ),
          users:user_id ( email )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <MessageSquareWarning className="h-6 w-6 text-amber-500" />
            Feedback de Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Respuestas recibidas desde las encuestas de la aplicación móvil.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : feedbackList && feedbackList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <MessageSquareWarning className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">Aún no hay feedback registrado</p>
          <p className="text-xs text-muted-foreground mt-1">Las respuestas aparecerán aquí cuando los usuarios las envíen desde sus dispositivos.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feedbackList?.map((fb: any) => (
            <div key={fb.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-4 w-4", fb.rating >= s ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
                    {format(new Date(fb.created_at), "dd 'de' MMM, HH:mm", { locale: es })}
                  </p>
                </div>
                <div className={cn("px-2 py-1 flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase", fb.had_errors ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-500")}>
                  {fb.had_errors ? <><ThumbsDown className="h-3 w-3" /> Con Fallos</> : <><ThumbsUp className="h-3 w-3" /> Sin Fallos</>}
                </div>
              </div>

              {fb.comments && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm italic text-foreground/80 mt-1">
                  "{fb.comments}"
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                <p><span className="font-semibold text-foreground">Usuario:</span> {fb.users?.email ?? 'Desconocido'}</p>
                <p><span className="font-semibold text-foreground">Org:</span> {fb.organizations?.name ?? '—'}</p>
                <p><span className="font-semibold text-foreground">Versión:</span> {fb.app_version}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}