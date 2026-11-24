import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDispatchForm } from '@/contexts/DispatchFormContext';

const CURRENT = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

/** Detecta una nueva publicación y recarga solo cuando es seguro (sin despacho abierto ni escritura activa). */
export default function AppUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const { openKey } = useDispatchForm();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const { build } = await r.json();
        if (!stop && build && build !== CURRENT) setAvailable(true);
      } catch { /* sin conexión: reintentar luego */ }
    };
    const id = window.setInterval(check, 60_000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    check();
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Recarga automática segura: sin despacho abierto, sin diálogos y sin escribir en un campo.
  useEffect(() => {
    if (!available) return;
    const id = window.setInterval(() => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const dialog = document.querySelector('[role="dialog"],[role="alertdialog"]');
      if (!openKey && !typing && !dialog) window.location.reload();
    }, 15_000);
    return () => clearInterval(id);
  }, [available, openKey]);

  if (!available) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-3 rounded-lg border border-primary/50 bg-card px-4 py-2 text-sm text-card-foreground shadow-lg">
      <RefreshCw className="h-4 w-4 animate-pulse text-primary" />
      <span>Nueva actualización disponible</span>
      <Button size="sm" onClick={() => window.location.reload()}>Actualizar ahora</Button>
    </div>
  );
}
