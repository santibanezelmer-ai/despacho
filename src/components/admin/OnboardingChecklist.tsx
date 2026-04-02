import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Loader2, Rocket, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { cn } from '@/lib/utils';

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useOnboardingChecklist();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!items) return null;

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100);
  const allDone = completed === total;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          {allDone ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--success))]/15">
              <Rocket className="h-5 w-5 text-[hsl(var(--success))]" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">
              {allDone
                ? 'Tu organización ya está lista para operar'
                : 'Tu organización aún no está lista para operar completamente'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {completed} de {total} pasos completados · {percent}%
            </p>
          </div>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-4 rounded-xl border p-4 transition-colors',
              item.completed
                ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5'
                : 'border-border bg-card hover:bg-card/80'
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', item.completed && 'text-muted-foreground line-through')}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            {!item.completed && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs flex-shrink-0"
                onClick={() => navigate(item.navigateTo)}
              >
                Ir a configurar <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
