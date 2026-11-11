import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquareWarning, ThumbsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationOptional } from '@/contexts/OrganizationContext';
import { Preferences } from '@capacitor/preferences';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsNativeMobile } from '@/hooks/useIsNativeMobile';

export function FeedbackSurvey() {
  const { user } = useAuth();
  const orgCtx = useOrganizationOptional();
  const isNative = useIsNativeMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hadErrors, setHadErrors] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Solo mostramos la encuesta si el usuario está logueado, es en dispositivo nativo y tenemos contexto de org.
    if (!user || !isNative || !orgCtx?.orgId) return;

    const checkShouldShow = async () => {
      try {
        // 1. Validar si ya respondió o rechazó la encuesta
        const { value: status } = await Preferences.get({ key: 'operix_feedback_status' });
        if (status === 'done' || status === 'never') return;

        // 2. Aumentar el contador de aperturas
        const { value: opensStr } = await Preferences.get({ key: 'operix_app_opens' });
        const opens = (parseInt(opensStr || '0', 10)) + 1;
        await Preferences.set({ key: 'operix_app_opens', value: opens.toString() });

        // 3. Regla Antispam: Mostrar en la 4ta apertura, y luego cada 10 aperturas si lo pospuso
        if (opens === 4 || (opens > 4 && opens % 10 === 0)) {

          // 4. Regla de Misión Crítica: NO MOSTRAR si hay emergencias activas
          const { count, error } = await (supabase as any)
            .from('emergencies')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgCtx.orgId)
            .not('status', 'in', '(finalizada,en_cuartel)');

          if (!error && count === 0) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.warn('[Feedback] Error evaluating survey trigger:', err);
      }
    };

    // Le damos unos segundos antes de evaluar para no entorpecer la carga inicial de la app
    const timer = setTimeout(checkShouldShow, 5000);
    return () => clearTimeout(timer);
  }, [user, isNative, orgCtx?.orgId]);

  const handleDismiss = async (neverShowAgain: boolean) => {
    setIsOpen(false);
    if (neverShowAgain) {
      await Preferences.set({ key: 'operix_feedback_status', value: 'never' });
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }
    if (hadErrors === null) {
      toast.error('Por favor indícanos si has tenido errores');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from('app_feedback').insert({
        user_id: user?.id,
        organization_id: orgCtx?.orgId,
        rating,
        had_errors: hadErrors,
        comments,
        app_version: '1.1.6 (Android)',
      });

      if (error) {
        console.error('Feedback error:', error);
        throw error;
      }

      await Preferences.set({ key: 'operix_feedback_status', value: 'done' });
      setIsOpen(false);
      toast.success('¡Gracias por ayudarnos a mejorar!', {
        icon: <ThumbsUp className="h-4 w-4 text-emerald-500" />
      });
    } catch (err) {
      toast.error('No pudimos enviar tus respuestas. Intenta más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss(false)}>
      <DialogContent className="w-[90%] sm:max-w-md rounded-2xl p-0 overflow-hidden border-2 border-border/60 bg-background max-h-[90vh] flex flex-col mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-gradient-to-br from-card to-muted flex flex-col h-full">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <div className="mx-auto bg-amber-500/10 p-3 rounded-full mb-3">
              <MessageSquareWarning className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-center font-display uppercase text-2xl leading-tight">
              ¿Qué te parece la App?
            </DialogTitle>
            <DialogDescription className="text-center text-sm mt-2">
              Tu opinión es vital para asegurar que la aplicación no falle durante las emergencias.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Rating */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground text-center block">
                ¿Cómo calificarías tu experiencia general?
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-9 w-9 transition-colors",
                        rating >= star ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Errores */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground text-center block">
                ¿Has tenido problemas al recibir los despachos?
              </label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={hadErrors === true ? 'default' : 'outline'}
                  className={cn("flex-1", hadErrors === true && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive")}
                  onClick={() => setHadErrors(true)}
                >
                  Sí, tuve fallos
                </Button>
                <Button
                  type="button"
                  variant={hadErrors === false ? 'default' : 'outline'}
                  className={cn("flex-1", hadErrors === false && "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500")}
                  onClick={() => setHadErrors(false)}
                >
                  No, todo bien
                </Button>
              </div>
            </div>

            {/* Comentarios */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">
                Comentarios adicionales (Opcional)
              </label>
              <Textarea
                placeholder="Si tuviste fallos, cuéntanos qué marca de celular usas o qué ocurrió..."
                className="resize-none h-20 text-sm bg-background"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 pt-0 shrink-0 flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0 || hadErrors === null} className="w-full bg-foreground text-background hover:bg-foreground/90 h-12">
              {isSubmitting ? 'Enviando...' : 'Enviar Respuestas'}
            </Button>
            <div className="flex justify-between mt-2">
              <button type="button" onClick={() => handleDismiss(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                Recordarme luego
              </button>
              <button type="button" onClick={() => handleDismiss(true)} className="text-xs text-muted-foreground/60 hover:text-destructive px-2 py-1">
                No volver a preguntar
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}