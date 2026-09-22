import { memo, useEffect, useState } from 'react';
import { useTimeFormat } from '@/hooks/useTimeFormat';

/**
 * Reloj aislado: su estado (cada segundo) vive aquí dentro, por lo que
 * ningún otro componente de la Consola de Despacho se vuelve a renderizar.
 */
const SystemClock = memo(function SystemClock({ className }: { className?: string }) {
  const { formatClock } = useTimeFormat();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className ?? 'text-xl font-mono font-bold text-foreground'}>
      {formatClock(now)}
    </span>
  );
});

export default SystemClock;

/** Fecha larga: se revisa cada minuto para que cambie al pasar medianoche. */
export const SystemDate = memo(function SystemDate({ className }: { className?: string }) {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setToday(prev => {
        const next = new Date();
        return next.toDateString() === prev.toDateString() ? prev : next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className={className ?? 'mt-0.5 text-xs text-muted-foreground font-mono'}>
      {today.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </p>
  );
});
