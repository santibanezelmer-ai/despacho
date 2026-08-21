import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Siren, WifiOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/location-share`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SEND_INTERVAL_MS = 5000;

type Phase = 'checking' | 'ready' | 'sending' | 'sent' | 'invalid' | 'expired' | 'denied';

type Fix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery_level: number | null;
  timestamp: string;
};

export default function SharedLocationPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('checking');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queued, setQueued] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const lastKeyRef = useRef<string | null>(null);
  const queueRef = useRef<Fix[]>([]);
  const flushingRef = useRef(false);
  const storageKey = `operix.location.queue.${token ?? 'none'}`;

  // ---- Cola persistente (sobrevive pérdida de red y recargas) ----
  const persistQueue = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(queueRef.current.slice(-20)));
    } catch { /* almacenamiento no disponible: la cola sigue en memoria */ }
    setQueued(queueRef.current.length);
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        queueRef.current = JSON.parse(raw) ?? [];
        setQueued(queueRef.current.length);
      }
    } catch { /* cola corrupta: se ignora */ }
  }, [storageKey]);

  const postFix = useCallback(async (fix: Fix) => {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ token, ...fix }),
    });
    if (res.status === 410) {
      setPhase('expired');
      throw new Error('Enlace expirado');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? 'No se pudo enviar la ubicación');
    }
  }, [token]);

  /** Envía la cola en orden; deja pendientes los que fallen por red. */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || !queueRef.current.length) return;
    flushingRef.current = true;
    try {
      while (queueRef.current.length) {
        const fix = queueRef.current[0];
        try {
          await postFix(fix);
        } catch (e) {
          if ((e as Error).message === 'Enlace expirado') {
            queueRef.current = [];
            persistQueue();
          }
          return; // se reintenta cuando vuelva la conexión
        }
        queueRef.current.shift();
        persistQueue();
        setLastSentAt(fix.timestamp);
        setAccuracy(fix.accuracy);
        setError(null);
        setPhase((p) => (p === 'sent' ? p : 'sent'));
      }
    } finally {
      flushingRef.current = false;
    }
  }, [postFix, persistQueue]);

  const enqueue = useCallback((fix: Fix) => {
    // Evita duplicados exactos en la cola.
    const key = `${fix.latitude.toFixed(6)},${fix.longitude.toFixed(6)},${fix.timestamp}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    queueRef.current.push(fix);
    persistQueue();
    void flushQueue();
  }, [flushQueue, persistQueue]);

  // ---- Reintento automático al recuperar conexión ----
  useEffect(() => {
    const up = () => { setOnline(true); void flushQueue(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const interval = setInterval(() => { if (navigator.onLine) void flushQueue(); }, 10000);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      clearInterval(interval);
    };
  }, [flushQueue]);

  // ---- Validación del enlace ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token ?? '')}`, {
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.valid) {
          setPhase(data?.reason === 'expired' ? 'expired' : 'invalid');
          return;
        }
        setOrgName(data.organizationName ?? null);
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const toFix = (pos: GeolocationPosition, battery: number | null): Fix => ({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
    speed: Number.isFinite(pos.coords.speed as number) ? pos.coords.speed : null,
    heading: Number.isFinite(pos.coords.heading as number) ? pos.coords.heading : null,
    battery_level: battery,
    timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
  });

  const readBattery = async (): Promise<number | null> => {
    try {
      const nav = navigator as any;
      if (nav.getBattery) return Math.round(((await nav.getBattery()).level ?? 0) * 100);
    } catch { /* opcional */ }
    return null;
  };

  const geoErrorHint = (code: number): string => {
    if (code === 1) {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'Permiso denegado. Vaya a Ajustes → Safari → Ubicación → Permitir, recargue esta página y vuelva a intentar.'
        : 'Permiso denegado. Toque el candado 🔒 junto a la dirección → Permisos → Ubicación → Permitir, y recargue la página.';
    }
    if (code === 2) return 'Ubicación no disponible. Active el GPS del teléfono y salga a un lugar con señal.';
    return 'Se agotó el tiempo de espera del GPS. Verifique que el GPS esté activado e intente nuevamente.';
  };

  const handleShare = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Este dispositivo no permite compartir ubicación');
      setHint('Abra el enlace en Chrome o Safari actualizado.');
      setPhase('denied');
      return;
    }
    setPhase('sending');
    setError(null);
    setHint(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const battery = await readBattery();
        lastSentAtRef.current = Date.now();
        enqueue(toFix(pos, battery));
        setAccuracy(pos.coords.accuracy ?? null);
        setPhase('sent');

        // Un único watcher: si ya existe, no se crea otro.
        if (watchIdRef.current === null) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              if (Date.now() - lastSentAtRef.current < SEND_INTERVAL_MS) return;
              lastSentAtRef.current = Date.now();
              void readBattery().then((b) => enqueue(toFix(p, b)));
            },
            () => { /* errores intermitentes del watcher no interrumpen el envío */ },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
          );
        }
      },
      (err) => {
        setError('No se pudo obtener la ubicación.');
        setHint(geoErrorHint(err.code));
        setPhase('denied');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }, [enqueue]);

  // ---- Detiene el seguimiento al cerrar la página ----
  useEffect(() => {
    const stop = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      stop();
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-5 py-10 text-center">
      <div className="mb-8 flex items-center gap-2">
        <Siren className="h-7 w-7 text-emergency" />
        <span className="text-xl font-bold tracking-tight text-foreground">Operix Dispatch</span>
      </div>

      {phase === 'checking' && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}

      {(phase === 'invalid' || phase === 'expired') && (
        <div className="max-w-sm space-y-3">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
          <h1 className="text-lg font-semibold text-foreground">
            {phase === 'expired' ? 'El enlace ha expirado' : 'Enlace no válido'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Comuníquese nuevamente con la central de emergencias para recibir un enlace vigente.
          </p>
        </div>
      )}

      {(phase === 'ready' || phase === 'sending' || phase === 'denied') && (
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-xl font-semibold leading-snug text-foreground">
            El operador solicita conocer su ubicación para atender la emergencia.
          </h1>
          {orgName && <p className="font-mono text-xs text-muted-foreground">{orgName}</p>}
          <Button
            onClick={handleShare}
            disabled={phase === 'sending'}
            className="h-20 w-full rounded-xl bg-emergency text-lg font-bold text-emergency-foreground shadow-lg active:scale-[0.98] hover:bg-emergency/90"
          >
            {phase === 'sending' ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-6 w-6" />
            )}
            Compartir mi ubicación
          </Button>
          <p className="flex items-start gap-2 text-left text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Active el GPS de su teléfono y acepte el permiso de ubicación cuando aparezca.
          </p>
          {error && <p className="text-sm font-medium text-emergency">{error}</p>}
          {hint && (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-left text-xs text-foreground">
              {hint}
            </p>
          )}
          {phase === 'denied' && (
            <Button variant="outline" className="w-full" onClick={handleShare}>
              Intentar nuevamente
            </Button>
          )}
        </div>
      )}

      {phase === 'sent' && (
        <div className="w-full max-w-sm space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="text-lg font-semibold text-foreground">Ubicación enviada correctamente.</h1>
          <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
            <p>Precisión: {accuracy != null ? `${Math.round(accuracy)} m` : '—'}</p>
            <p>
              Última actualización:{' '}
              {lastSentAt ? new Date(lastSentAt).toLocaleTimeString('es-CL') : '—'}
            </p>
          </div>
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm font-medium text-foreground">
            Mantenga esta página abierta para que la central siga viendo su ubicación en vivo.
          </p>
          {(!online || queued > 0) && (
            <p className="flex items-center justify-center gap-2 text-xs text-warning">
              <WifiOff className="h-4 w-4" />
              {online
                ? `Reenviando ${queued} actualización(es) pendiente(s)…`
                : `Sin conexión — ${queued} actualización(es) guardada(s), se enviarán al recuperar Internet.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
