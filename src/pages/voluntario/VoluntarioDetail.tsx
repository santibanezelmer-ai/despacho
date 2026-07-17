import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, MapPin, Navigation, CheckCircle2, XCircle, Clock, Phone, FileText, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props { organizationId: string }

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho', en_camino: 'En camino', trabajando: 'Trabajando',
  controlada: 'Controlada', finalizada: 'Finalizada',
};

export default function VoluntarioDetail({ organizationId }: Props) {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: emg, isLoading } = useQuery({
    queryKey: ['vol-emg', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('id', id).eq('organization_id', organizationId).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const { data: myAttendance } = useQuery({
    queryKey: ['vol-att', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data } = await (supabase as any)
        .from('emergency_attendance')
        .select('*').eq('emergency_id', id).eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vol-emg-vehicles', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergency_vehicles')
        .select('id, status, vehicles(code, type)')
        .eq('emergency_id', id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const confirm = async (status: 'going' | 'not_going') => {
    if (!user || !id || !emg) return;
    setSaving(true);
    const { error } = await (supabase as any).from('emergency_attendance').upsert(
      {
        emergency_id: id, organization_id: emg.organization_id, user_id: user.id,
        status, confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'emergency_id,user_id' },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(status === 'going' ? 'Asistencia confirmada' : 'Marcaste que no asistirás');
      qc.invalidateQueries({ queryKey: ['vol-att', id, user.id] });
    }
  };

  if (isLoading || !emg) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>;
  }

  const hasCoords = emg.latitude && emg.longitude;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${emg.latitude},${emg.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emg.address)}`;
  const wazeUrl = hasCoords ? `https://waze.com/ul?ll=${emg.latitude},${emg.longitude}&navigate=yes` : null;

  return (
    <div className="max-w-md mx-auto pb-6">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Volver" className="p-2 -ml-2"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-mono">{emg.folio}</p>
          <p className="text-sm font-semibold text-foreground truncate">{STATUS_LABEL[emg.status] || emg.status}</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div
          className="rounded-xl p-4 text-white"
          style={{ backgroundColor: emg.emergency_keys?.color || '#dc2626' }}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Clave {emg.emergency_keys?.code}</p>
          <p className="text-xl font-bold">{emg.emergency_keys?.name || 'Emergencia'}</p>
        </div>

        <Section icon={<MapPin className="h-4 w-4" />} label="Dirección">
          <p className="text-foreground">{emg.address}</p>
          {emg.reference && <p className="text-xs text-muted-foreground mt-1">Ref: {emg.reference}</p>}
        </Section>

        <div className="grid grid-cols-2 gap-2">
          <a href={mapsUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 h-14 rounded-xl bg-emergency text-emergency-foreground font-semibold text-sm active:scale-95 transition-transform">
            <Navigation className="h-5 w-5" /> Google Maps
          </a>
          {wazeUrl && (
            <a href={wazeUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 h-14 rounded-xl bg-card border border-border font-semibold text-sm active:scale-95 transition-transform">
              <Navigation className="h-5 w-5" /> Waze
            </a>
          )}
        </div>

        <Section icon={<Clock className="h-4 w-4" />} label="Tiempos">
          <Row k="Despachada" v={fmt(emg.dispatched_at)} />
          {emg.en_route_at && <Row k="En camino" v={fmt(emg.en_route_at)} />}
          {emg.working_at && <Row k="Trabajando" v={fmt(emg.working_at)} />}
          {emg.controlled_at && <Row k="Controlada" v={fmt(emg.controlled_at)} />}
          {emg.finished_at && <Row k="Finalizada" v={fmt(emg.finished_at)} />}
        </Section>

        {emg.observations && (
          <Section icon={<FileText className="h-4 w-4" />} label="Observaciones">
            <p className="text-foreground whitespace-pre-wrap text-sm">{emg.observations}</p>
          </Section>
        )}

        {(emg.caller_name || emg.caller_phone) && (
          <Section icon={<Phone className="h-4 w-4" />} label="Llamante">
            {emg.caller_name && <p className="text-foreground text-sm">{emg.caller_name}</p>}
            {emg.caller_phone && <a href={`tel:${emg.caller_phone}`} className="text-emergency text-sm font-mono">{emg.caller_phone}</a>}
          </Section>
        )}

        {emg.status !== 'finalizada' && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Tu asistencia</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => confirm('going')} disabled={saving}
                className={`h-14 ${myAttendance?.status === 'going' ? 'bg-success text-success-foreground' : 'bg-card border border-border text-foreground hover:bg-muted'}`}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Voy
              </Button>
              <Button
                onClick={() => confirm('not_going')} disabled={saving}
                className={`h-14 ${myAttendance?.status === 'not_going' ? 'bg-destructive text-destructive-foreground' : 'bg-card border border-border text-foreground hover:bg-muted'}`}
              >
                <XCircle className="h-5 w-5 mr-2" /> No voy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}<span className="uppercase tracking-wide">{label}</span></div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-sm py-0.5"><span className="text-muted-foreground">{k}</span><span className="text-foreground font-mono">{v}</span></div>;
}

function fmt(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
