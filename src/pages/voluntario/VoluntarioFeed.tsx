import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Truck, Megaphone, Ban, FileText, CheckCircle2, XCircle, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props { organizationId: string; orgName?: string; orgLogoUrl?: string | null }

const STATUS_LABEL: Record<string, string> = {
  despacho: 'Despacho',
  en_camino: 'En camino',
  trabajando: 'Trabajando',
  controlada: 'Controlada',
  finalizada: 'Finalizada',
  en_cuartel: 'Finalizada',
};

const STATUS_TONE: Record<string, string> = {
  despacho: 'bg-emergency text-emergency-foreground',
  en_camino: 'bg-amber-500 text-black',
  trabajando: 'bg-orange-500 text-black',
  controlada: 'bg-blue-500 text-white',
  finalizada: 'bg-muted text-muted-foreground',
  en_cuartel: 'bg-muted text-muted-foreground',
};

// Auto-scale code text so long codes like "10-0-15" don't overflow the badge.
function codeSize(code?: string | null, base: 'lg' | 'xl' | '2xl' = '2xl') {
  const len = (code || '?').length;
  if (base === '2xl') return len >= 7 ? 'text-sm' : len >= 6 ? 'text-base' : len >= 5 ? 'text-lg' : len >= 4 ? 'text-xl' : 'text-2xl';
  if (base === 'xl') return len >= 7 ? 'text-xs' : len >= 6 ? 'text-sm' : len >= 5 ? 'text-base' : len >= 4 ? 'text-lg' : 'text-xl';
  return len >= 7 ? 'text-[10px]' : len >= 6 ? 'text-xs' : len >= 5 ? 'text-sm' : len >= 4 ? 'text-base' : 'text-lg';
}

export default function VoluntarioFeed({ organizationId, orgName, orgLogoUrl }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vol-feed', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergencies')
        .select('id, folio, address, status, dispatched_at, created_at, observations, pre_report, declared, false_alarm, latitude, longitude, emergency_keys(code, name, color)')
        .eq('organization_id', organizationId)
        .not('status', 'in', '(finalizada,en_cuartel)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const enriched = await Promise.all(
        (data ?? []).map(async (e: any) => {
          const { data: ev } = await (supabase as any)
            .from('emergency_vehicles')
            .select('vehicles(code)')
            .eq('emergency_id', e.id);
          return {
            ...e,
            vehicleCodes: (ev ?? []).map((r: any) => r.vehicles?.code).filter(Boolean),
          };
        }),
      );
      return enriched;
    },
    refetchInterval: 10_000,
  });

  const { data: notes } = useQuery({
    queryKey: ['vol-notes', organizationId],
    queryFn: async () => {
      // Comunicados: máx 7 días de vigencia; luego desaparecen del feed.
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from('dispatch_notes')
        .select('id, title, content, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  const ids = (data ?? []).map((e: any) => e.id);
  const { data: attendance } = useQuery({
    queryKey: ['vol-att-batch', user?.id, ids.join(',')],
    queryFn: async () => {
      if (!user || !ids.length) return {};
      const { data } = await (supabase as any)
        .from('emergency_attendance')
        .select('emergency_id, status')
        .eq('user_id', user.id)
        .in('emergency_id', ids);
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.emergency_id] = r.status;
      return map;
    },
    enabled: !!user && ids.length > 0,
    refetchInterval: 15_000,
  });

  const confirm = async (emg: any, status: 'going' | 'not_going') => {
    if (!user) return;
    try { navigator.vibrate?.(status === 'going' ? [30, 30, 30] : 30); } catch { /* noop */ }
    const { error } = await (supabase as any).from('emergency_attendance').upsert(
      {
        emergency_id: emg.id,
        organization_id: emg.organization_id ?? organizationId,
        user_id: user.id,
        status,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'emergency_id,user_id' },
    );
    if (error) return toast.error(error.message);
    toast.success(status === 'going' ? 'Voy confirmado' : 'Marcado: no voy');
    qc.invalidateQueries({ queryKey: ['vol-att-batch'] });
  };

  const [latest, ...rest] = data ?? [];

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-cond">
          <span className="vol-live-dot" /> En vivo · alerta por cada despacho
        </div>
        <h1 className="text-4xl mt-1 leading-none text-foreground">Emergencias Activas</h1>
      </header>

      {/* Comunicados — presented as emergency-like cards, persistent */}
      {!!notes?.length && (
        <div className="px-5 mb-4 space-y-3">
          {notes.map((n: any) => (
            <div
              key={n.id}
              className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/15 to-amber-600/5 p-4 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black shadow-lg">
                  <Megaphone className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-cond uppercase tracking-widest text-[11px] px-2 py-0.5 rounded bg-amber-500 text-black font-bold">
                      Comunicado
                    </span>
                    <span className="text-[10px] text-muted-foreground font-cond uppercase tracking-wider ml-auto">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  {n.title && (
                    <p className="font-display uppercase text-xl leading-tight text-foreground">{n.title}</p>
                  )}
                  <p className="text-[15px] leading-snug text-foreground/90 whitespace-pre-wrap mt-1">
                    {n.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>
      ) : !data?.length ? (
        <div className="px-5">
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 py-14 text-center">
            <p className="font-cond uppercase tracking-widest text-xs text-muted-foreground">Sin actividad</p>
            <p className="text-sm text-foreground/80 mt-1">No hay emergencias activas.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-5 pb-6">
          {/* Hero — latest emergency */}
          <HotCard emg={latest} myStatus={attendance?.[latest.id]} onConfirm={confirm} />

          {rest.length > 0 && (
            <p className="font-cond uppercase tracking-widest text-[10px] text-muted-foreground pt-3 pl-1">
              También activas · {rest.length}
            </p>
          )}

          {rest.map((e: any) => (
            <RowCard key={e.id} emg={e} myStatus={attendance?.[e.id]} onConfirm={confirm} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Cards ---------------- */

function HotCard({ emg, myStatus, onConfirm }: { emg: any; myStatus?: string; onConfirm: (e: any, s: 'going' | 'not_going') => void }) {
  const mapsUrl = emg.latitude && emg.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${emg.latitude},${emg.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emg.address)}`;

  return (
    <div className="vol-card-hot rounded-2xl p-4">
      <Link to={`/voluntario/emergencia/${emg.id}`} className="block active:scale-[0.99] transition-transform">
        <div className="flex items-start gap-3">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-white shadow-lg overflow-hidden"
            style={{ backgroundColor: emg.emergency_keys?.color || '#dc2626' }}
          >
            <div className={`text-center leading-none px-0.5 w-full break-words font-display ${codeSize(emg.emergency_keys?.code, '2xl')}`}>
              {emg.emergency_keys?.code || '?'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`font-cond uppercase tracking-widest text-[10px] px-2 py-0.5 rounded ${STATUS_TONE[emg.status] || 'bg-muted text-muted-foreground'}`}>
                {STATUS_LABEL[emg.status] || emg.status}
              </span>
            </div>
            <p className="text-xl leading-tight text-foreground font-display uppercase truncate">
              {emg.emergency_keys?.name || 'Emergencia'}
            </p>
            <p className="text-sm text-foreground/85 mt-1 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emergency" />
              <span className="line-clamp-2">{emg.address}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 font-cond uppercase tracking-wider">
              Hace {formatDistanceToNow(new Date(emg.dispatched_at || emg.created_at), { locale: es })}
            </p>
          </div>
        </div>

        <Badges emg={emg} />

        {!!emg.vehicleCodes?.length && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            {emg.vehicleCodes.map((code: string) => (
              <span key={code} className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                {code}
              </span>
            ))}
          </div>
        )}

        {emg.pre_report && (
          <p className="mt-3 text-[12px] text-foreground/80 line-clamp-2 flex items-start gap-1.5 border-l-2 border-emergency/50 pl-2">
            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emergency" /> {emg.pre_report}
          </p>
        )}
      </Link>

      {/* Speed actions — no drill-down needed */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => onConfirm(emg, 'going')}
          className={`h-12 rounded-xl font-cond uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 active:scale-95 transition ${
            myStatus === 'going' ? 'bg-success text-success-foreground' : 'bg-emergency text-emergency-foreground'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> Voy
        </button>
        <button
          onClick={() => onConfirm(emg, 'not_going')}
          className={`h-12 rounded-xl font-cond uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 active:scale-95 transition ${
            myStatus === 'not_going' ? 'bg-muted text-foreground' : 'bg-card border border-border text-foreground/80'
          }`}
        >
          <XCircle className="h-4 w-4" /> No voy
        </button>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener"
          className="h-12 rounded-xl font-cond uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 bg-foreground text-background active:scale-95 transition"
        >
          <Navigation className="h-4 w-4" /> Ir
        </a>
      </div>
    </div>
  );
}

function RowCard({ emg, myStatus, onConfirm }: { emg: any; myStatus?: string; onConfirm: (e: any, s: 'going' | 'not_going') => void }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Link to={`/voluntario/emergencia/${emg.id}`} className="block p-3.5 active:bg-muted/40 transition">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white font-display px-0.5 text-center leading-none overflow-hidden break-words ${codeSize(emg.emergency_keys?.code, 'lg')}`}
            style={{ backgroundColor: emg.emergency_keys?.color || '#dc2626' }}
          >
            {emg.emergency_keys?.code || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display uppercase text-lg leading-none text-foreground truncate">
                {emg.emergency_keys?.name || 'Emergencia'}
              </p>
              <span className={`ml-auto font-cond uppercase tracking-widest text-[9px] px-1.5 py-0.5 rounded ${STATUS_TONE[emg.status] || 'bg-muted text-muted-foreground'}`}>
                {STATUS_LABEL[emg.status] || emg.status}
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 mt-0.5 flex items-start gap-1 line-clamp-1">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              {emg.address}
            </p>
            <div className="mt-1.5 text-[10px] font-cond uppercase tracking-widest text-muted-foreground">
              Hace {formatDistanceToNow(new Date(emg.dispatched_at || emg.created_at), { locale: es })}
            </div>
          </div>
        </div>
        <Badges emg={emg} compact />
      </Link>

      <div className="grid grid-cols-2 border-t border-border/60">
        <button
          onClick={() => onConfirm(emg, 'going')}
          className={`h-11 font-cond uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 active:scale-95 transition border-r border-border/60 ${
            myStatus === 'going' ? 'bg-success/20 text-success' : 'text-foreground/80'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> Voy
        </button>
        <button
          onClick={() => onConfirm(emg, 'not_going')}
          className={`h-11 font-cond uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 active:scale-95 transition ${
            myStatus === 'not_going' ? 'bg-muted text-foreground' : 'text-muted-foreground'
          }`}
        >
          <XCircle className="h-4 w-4" /> No voy
        </button>
      </div>
    </div>
  );
}

function Badges({ emg, compact }: { emg: any; compact?: boolean }) {
  if (!emg.declared && !emg.false_alarm) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
      {emg.declared && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emergency/20 text-emergency text-[10px] px-2 py-0.5 font-cond uppercase tracking-widest">
          <Megaphone className="h-3 w-3" /> Declarado
        </span>
      )}
      {emg.false_alarm && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground text-[10px] px-2 py-0.5 font-cond uppercase tracking-widest">
          <Ban className="h-3 w-3" /> 6-16 Falsa Alarma
        </span>
      )}
    </div>
  );
}
