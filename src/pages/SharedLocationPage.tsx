import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/location-share`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Phase = 'checking' | 'ready' | 'sending' | 'sent' | 'invalid' | 'expired' | 'denied';

export default function SharedLocationPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('checking');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

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

  const send = useCallback(async (pos: GeolocationPosition) => {
    let battery: number | null = null;
    try {
      const nav = navigator as any;
      if (nav.getBattery) battery = Math.round(((await nav.getBattery()).level ?? 0) * 100);
    } catch { /* optional */ }

    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        token,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        battery_level: battery,
        timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? 'No se pudo enviar la ubicación');
    }
  }, [token]);

  const handleShare = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Este dispositivo no permite compartir ubicación');
      setPhase('denied');
      return;
    }
    setPhase('sending');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await send(pos);
          lastSentRef.current = Date.now();
          setPhase('sent');
          // Seguimiento en vivo mientras la página siga abierta (cada 5 s)
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              if (Date.now() - lastSentRef.current < 5000) return;
              lastSentRef.current = Date.now();
              void send(p).catch(() => {});
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
          );
        } catch (e) {
          setError((e as Error).message);
          setPhase('denied');
        }
      },
      () => {
        setError('No se pudo obtener la ubicación. Active el GPS y permita el acceso.');
        setPhase('denied');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }, [send]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-center">
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
          {orgName && <p className="text-xs font-mono text-muted-foreground">{orgName}</p>}
          <Button
            onClick={handleShare}
            disabled={phase === 'sending'}
            className="h-16 w-full bg-emergency text-base font-bold text-emergency-foreground hover:bg-emergency/90"
          >
            {phase === 'sending' ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-5 w-5" />
            )}
            Compartir mi ubicación
          </Button>
          {error && <p className="text-sm text-emergency">{error}</p>}
        </div>
      )}

      {phase === 'sent' && (
        <div className="max-w-sm space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="text-lg font-semibold text-foreground">Ubicación enviada correctamente.</h1>
          <p className="text-sm text-muted-foreground">Puede cerrar esta página.</p>
        </div>
      )}
    </div>
  );
}
