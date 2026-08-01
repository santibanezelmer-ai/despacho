import { useEffect, useState } from 'react';
import { MapPin, MessageCircle, Send, Copy, Loader2, Navigation, X } from 'lucide-react';
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

export default function LocationRequestPanel({ phone, requestId, onRequestCreated, fix, onFix, emergencyId }: Props) {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);


  // Realtime: escuchar la ubicación entrante del solicitante
  useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`location-request-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'location_requests', filter: `id=eq.${requestId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.latitude == null || row.longitude == null) return;
          onFix({
            latitude: row.latitude,
            longitude: row.longitude,
            accuracy: row.accuracy ?? null,
            receivedAt: row.last_ping_at ?? new Date().toISOString(),
            address: row.resolved_address ?? null,
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId, onFix]);

  const handleRequest = async () => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.replace(/\D/g, '').length < 8) {
      toast.error('Ingrese un número de teléfono válido');
      return;
    }
    if (link) { setModalOpen(true); return; }

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
        .select('id, token')
        .single();

      if (error) throw error;

      setLink(`${shareBase}/${data.token}`);
      onRequestCreated(data.id);
      setModalOpen(true);
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo generar el enlace');
    } finally {
      setCreating(false);
    }
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

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={handleRequest} disabled={creating}>
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
        Solicitar ubicación
      </Button>

      {/* Estado de ubicación */}
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
        <p className="mb-1.5 font-medium text-muted-foreground">Estado de ubicación</p>
        {!fix ? (
          <p className="flex items-center gap-1.5 font-mono text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emergency" /> Sin ubicación
          </p>
        ) : (
          <div className="space-y-1 font-mono text-foreground">
            <p className="flex items-center gap-1.5 text-success">
              <span className="pulse-live h-2 w-2 rounded-full bg-success" /> Ubicación recibida
            </p>
            <p>Precisión: {fix.accuracy != null ? `${Math.round(fix.accuracy)} metros` : '—'}</p>
            <p>Hora: {new Date(fix.receivedAt).toLocaleTimeString('es-CL')}</p>
            <p>Latitud: {fix.latitude.toFixed(6)}</p>
            <p>Longitud: {fix.longitude.toFixed(6)}</p>
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
