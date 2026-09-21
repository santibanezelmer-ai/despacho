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

/** Fecha larga: cambia una vez al día, se calcula al montar. */
export const SystemDate = memo(function SystemDate({ className }: { className?: string }) {
  const [today] = useState(() => new Date());
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
