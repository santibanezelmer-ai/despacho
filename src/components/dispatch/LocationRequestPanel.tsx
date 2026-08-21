import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, MessageCircle, Send, Copy, Loader2, Navigation, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  receivedAt: string;
  address: string | null;
};

interface Props {
  phone: string;
  requestId: string | null;
  onRequestCreated: (requestId: string) => void;
  fix: LocationFix | null;
  onFix: (fix: LocationFix) => void;
  /** Cuando la emergencia ya fue despachada, vincula la solicitud desde el inicio */
  emergencyId?: string | null;
}

// Usa el origen actual para que el enlace funcione tanto en preview como en producción
const shareBase = `${typeof window !== 'undefined' ? window.location.origin : 'https://operixdispatch.com'}/location`;

type Status = 'idle' | 'waiting' | 'received' | 'expired' | 'error';

export default function LocationRequestPanel({ phone, requestId, onRequestCreated, fix, onFix, emergencyId }: Props) {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ token: string; expires_at: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const applyRow = useCallback((row: any) => {
    if (row?.expires_at) setExpiresAt(row.expires_at);
    if (row?.latitude == null || row?.longitude == null) return;
    onFix({
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy ?? null,
      receivedAt: row.last_ping_at ?? new Date().toISOString(),
      address: row.resolved_address ?? null,
    });
  }, [onFix]);

  // Realtime con reconexión automática + respaldo por polling (una sola suscripción).
  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      if (cancelled || channelRef.current) return;
      const channel = supabase
        .channel(`location-request-${requestId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'location_requests', filter: `id=eq.${requestId}` },
          (payload) => applyRow(payload.new),
        )
        .subscribe((state) => {
          if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
            if (cancelled) return;
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            retry = setTimeout(subscribe, 3000);
          }
        });
      channelRef.current = channel;
    };

    const poll = async () => {
      const { data } = await supabase
        .from('location_requests')
        .select('latitude, longitude, accuracy, last_ping_at, resolved_address, status, expires_at')
        .eq('id', requestId)
        .maybeSingle();
      if (!cancelled && data) applyRow(data);
    };

    subscribe();
    void poll();
    const interval = setInterval(poll, 8000);

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requestId, applyRow]);

  // Estado visible para el operador
  useEffect(() => {
    const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
    if (fix) setStatus('received');
    else if (expired) setStatus('expired');
    else if (requestId) setStatus('waiting');
    else setStatus('idle');
  }, [fix, expiresAt, requestId]);

  // Revisa expiración mientras el panel esté abierto
  useEffect(() => {
    if (!expiresAt || fix) return;
    const t = setInterval(() => {
      if (new Date(expiresAt).getTime() < Date.now()) setStatus('expired');
    }, 15000);
    return () => clearInterval(t);
  }, [expiresAt, fix]);

  const createRequest = async (cleaned: string) => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('location_requests')
        .insert({
          organization_id: orgId!,
          phone: cleaned,
          created_by: user?.id ?? null,
          emergency_id: emergencyId ?? null,
        })
        .select('id, token, expires_at')
        .single();

      if (error) throw error;

      setLink(`${shareBase}/${data.token}`);
      setExpiresAt(data.expires_at);
      onRequestCreated(data.id);
      setDuplicate(null);
      setModalOpen(true);
    } catch (e: any) {
      setStatus('error');
      toast.error(e.message ?? 'No se pudo generar el enlace');
    } finally {
      setCreating(false);
    }
  };

  const handleRequest = async () => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.replace(/\D/g, '').length < 8) {
      toast.error('Ingrese un número de teléfono válido');
      return;
    }
    if (link) { setModalOpen(true); return; }

    // Advierte si ya existe una solicitud vigente para el mismo teléfono/emergencia
    setCreating(true);
    try {
      let query = supabase
        .from('location_requests')
        .select('id, token, expires_at')
        .eq('organization_id', orgId!)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      query = emergencyId ? query.eq('emergency_id', emergencyId) : query.eq('phone', cleaned);
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        setCreating(false);
        setDuplicate({ token: existing.token, expires_at: existing.expires_at });
        onRequestCreated(existing.id);
        return;
      }
    } catch {
      // Si la verificación falla, se continúa con la creación normal
    }
    setCreating(false);
    await createRequest(cleaned);
  };

  const reuseExisting = () => {
    if (!duplicate) return;
    setLink(`${shareBase}/${duplicate.token}`);
    setExpiresAt(duplicate.expires_at);
    setDuplicate(null);
    setModalOpen(true);
  };

  const message = `Operix Dispatch: para atender su emergencia necesitamos su ubicación. Toque este enlace y presione "Compartir mi ubicación": ${link}`;

  const openWhatsApp = () => {
    const target = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  const openSms = () => {
    const target = phone.replace(/[^\d+]/g, '');
    window.location.href = `sms:${target}?&body=${encodeURIComponent(message)}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link ?? '');
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const statusMeta: Record<Status, { dot: string; label: string; text: string }> = {
    idle: { dot: 'bg-muted-foreground', label: 'Sin solicitud', text: 'text-muted-foreground' },
    waiting: { dot: 'bg-warning', label: 'Esperando ubicación', text: 'text-warning' },
    received: { dot: 'bg-success', label: 'Ubicación recibida', text: 'text-success' },
    expired: { dot: 'bg-emergency', label: 'Enlace expirado', text: 'text-emergency' },
    error: { dot: 'bg-emergency', label: 'Error en la solicitud', text: 'text-emergency' },
  };
  const meta = statusMeta[status];

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={handleRequest} disabled={creating}>
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
        Solicitar ubicación
      </Button>

      {duplicate && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          <p className="mb-2 flex items-start gap-1.5 font-medium text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            Ya existe una solicitud vigente para este contacto. ¿Desea reutilizarla o generar una nueva?
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-7 text-xs" onClick={reuseExisting}>
              Reutilizar enlace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => { setDuplicate(null); void createRequest(phone.replace(/[^\d+]/g, '')); }}
            >
              Crear nueva
            </Button>
          </div>
        </div>
      )}

      {/* Estado de ubicación */}
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
        <p className="mb-1.5 font-medium text-muted-foreground">Estado de ubicación</p>
        <p className={`flex items-center gap-1.5 font-mono ${meta.text}`}>
          <span className={`h-2 w-2 rounded-full ${meta.dot} ${status === 'received' ? 'pulse-live' : ''}`} />
          {meta.label}
        </p>
        {status === 'waiting' && expiresAt && (
          <p className="mt-1 font-mono text-muted-foreground">
            Enlace vigente hasta {new Date(expiresAt).toLocaleTimeString('es-CL')}
          </p>
        )}
        {status === 'expired' && (
          <p className="mt-1 text-muted-foreground">Genere un enlace nuevo para volver a solicitar la ubicación.</p>
        )}
        {fix && (
          <div className="mt-1.5 space-y-1 font-mono text-foreground">
            <p>Precisión: {fix.accuracy != null ? `${Math.round(fix.accuracy)} metros` : '—'}</p>
            <p>Última actualización: {new Date(fix.receivedAt).toLocaleTimeString('es-CL')}</p>
            <p>Latitud: {fix.latitude.toFixed(6)}</p>
            <p>Longitud: {fix.longitude.toFixed(6)}</p>
            {fix.address && <p className="whitespace-pre-wrap font-sans">{fix.address}</p>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1.5 h-7 gap-1 text-xs"
              onClick={() => navigate('/mapa')}
            >
              <Navigation className="h-3 w-3" /> Ir al mapa
            </Button>
          </div>
        )}
      </div>

      {modalOpen && link && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="console-panel w-full max-w-md p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Enviar solicitud de ubicación</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 break-all rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground">{link}</p>
            <p className="mb-3 text-xs text-muted-foreground">El enlace expira automáticamente en 30 minutos.</p>
            <div className="space-y-2">
              <Button type="button" className="w-full gap-2" onClick={openWhatsApp}>
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </Button>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={openSms}>
                <Send className="h-4 w-4" /> Enviar por SMS
              </Button>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={copyLink}>
                <Copy className="h-4 w-4" /> Copiar enlace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
