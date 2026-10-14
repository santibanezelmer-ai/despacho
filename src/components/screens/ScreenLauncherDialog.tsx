import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Map, Monitor, Radio, Shield, Trash2, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

const VIEWS = [
  { id: 'central', path: '/pantalla-central', label: 'Pantalla Central', desc: 'Emergencias, móviles y oficiales', icon: Shield },
  { id: 'mapa', path: '/pantalla-mapa', label: 'Mapa Operativo', desc: 'Mapa en vivo a pantalla completa', icon: Map },
  { id: 'emergencias', path: '/pantalla-emergencias', label: 'Emergencias Activas', desc: 'Lista de despachos en curso', icon: Radio },
] as const;

export default function ScreenLauncherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [view, setView] = useState<string>('central');
  const [busy, setBusy] = useState(false);
  const tvUrl = `${window.location.origin}/tv`;

  const { data: screens } = useQuery({
    queryKey: ['screen-pairings', orgId],
    enabled: open && !!orgId,
    refetchInterval: open ? 10000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.from('screen_pairings')
        .select('id, name, view, last_seen_at, paired_at').eq('organization_id', orgId).is('revoked_at', null).order('paired_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const openLocal = (path: string, popup: boolean) => {
    if (popup) window.open(path, `screen-${path}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
    else window.open(path, '_blank');
    onOpenChange(false);
  };

  const pair = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('screen-display', {
      body: { action: 'pair', pin, organizationId: orgId, view, name: name || 'Pantalla' },
    });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error ?? 'Código inválido o vencido'); return; }
    toast.success('Pantalla vinculada');
    setPin(''); setName('');
    qc.invalidateQueries({ queryKey: ['screen-pairings'] });
  };

  const changeView = async (id: string, v: string) => {
    const { error } = await supabase.from('screen_pairings').update({ view: v }).eq('id', id);
    if (error) toast.error('No se pudo cambiar la vista');
    qc.invalidateQueries({ queryKey: ['screen-pairings'] });
  };
  const unpair = async (id: string) => {
    const { error } = await supabase.from('screen_pairings').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('No se pudo desvincular');
    else toast.success('Pantalla desvinculada');
    qc.invalidateQueries({ queryKey: ['screen-pairings'] });
  };

  const online = (ts: string | null) => !!ts && Date.now() - new Date(ts).getTime() < 30000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Pantallas</DialogTitle>
          <DialogDescription>Elige qué pantalla abrir en este computador o envíala a otra pantalla.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Abrir en este computador</h3>
          {VIEWS.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <v.icon className="h-5 w-5 shrink-0 text-emergency" />
                <div className="min-w-0"><p className="font-semibold">{v.label}</p><p className="truncate text-xs text-muted-foreground">{v.desc}</p></div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => openLocal(v.path, false)}><ExternalLink className="mr-1 h-3.5 w-3.5" />Pestaña</Button>
                <Button size="sm" onClick={() => openLocal(v.path, true)}>Ventana</Button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Tv className="h-4 w-4" /> Pantallas remotas (sin iniciar sesión)</h3>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border p-3">
              <QRCodeSVG value={tvUrl} size={110} bgColor="transparent" fgColor="hsl(var(--foreground))" />
              <p className="font-mono text-xs">{tvUrl.replace(/^https?:\/\//, '')}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">1. En la TV o pantalla, abre esta dirección o escanea el QR.<br />2. Aparecerá un código de 6 números: ingrésalo aquí.</p>
              <div className="flex flex-wrap gap-2">
                <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código" inputMode="numeric" className="w-28 font-mono" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (ej. TV Guardia)" className="min-w-0 flex-1" maxLength={60} />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={view} onChange={(e) => setView(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                <Button size="sm" disabled={pin.length !== 6 || busy} onClick={pair}>Vincular pantalla</Button>
              </div>
            </div>
          </div>

          {(screens ?? []).length > 0 && (
            <div className="space-y-2">
              {(screens ?? []).map((s: any) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${online(s.last_seen_at) ? 'bg-success' : 'bg-muted-foreground'}`} />
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{online(s.last_seen_at) ? 'En línea' : 'Desconectada'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={s.view} onChange={(e) => changeView(s.id, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                      {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => unpair(s.id)} aria-label="Desvincular"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
