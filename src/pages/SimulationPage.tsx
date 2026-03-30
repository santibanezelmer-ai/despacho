import { useState } from 'react';
import { Play, Trash2, Zap, MapPin, Siren, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmergencyKeys } from '@/hooks/useEmergencyKeys';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveEmergencies } from '@/hooks/useEmergencies';

const SAMPLE_ADDRESSES = [
  'Av. Libertador Bernardo O\'Higgins 1234, Santiago',
  'Calle Merced 456, Santiago Centro',
  'Av. Providencia 2100, Providencia',
  'Gran Avenida José Miguel Carrera 8500, La Cisterna',
  'Av. Concha y Toro 900, Puente Alto',
  'Calle Diagonal Paraguay 100, Santiago',
  'Av. Irarrázaval 3000, Ñuñoa',
  'Av. Apoquindo 5000, Las Condes',
];

export default function SimulationPage() {
  const { data: keys } = useEmergencyKeys();
  const { data: vehicles } = useVehicles();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: emergencies } = useActiveEmergencies();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    keyId: '',
    address: '',
    callerName: 'Simulación',
    callerPhone: '',
    lat: '-33.4489',
    lng: '-70.6693',
  });

  const activeKeys = (keys ?? []).filter(k => k.active);

  const randomize = () => {
    const randomKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    const randomAddr = SAMPLE_ADDRESSES[Math.floor(Math.random() * SAMPLE_ADDRESSES.length)];
    const lat = -33.4489 + (Math.random() - 0.5) * 0.1;
    const lng = -70.6693 + (Math.random() - 0.5) * 0.1;
    setForm({
      keyId: randomKey?.id ?? '',
      address: randomAddr,
      callerName: 'Simulación Automática',
      callerPhone: '+56 9 ' + Math.floor(Math.random() * 90000000 + 10000000),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
  };

  const handleCreate = async () => {
    if (!form.keyId || !form.address) {
      toast.error('Seleccione clave y dirección');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('emergencies').insert({
        emergency_key_id: form.keyId,
        organization_id: orgId!,
        address: form.address,
        caller_name: form.callerName || 'Simulación',
        caller_phone: form.callerPhone || null,
        latitude: parseFloat(form.lat) || null,
        longitude: parseFloat(form.lng) || null,
        created_by: user?.id,
        folio: '',
        observations: '⚠️ SIMULACIÓN - Emergencia ficticia para entrenamiento',
      });
      if (error) throw error;

      toast.success('Emergencia de simulación creada');
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      setForm({ keyId: '', address: '', callerName: 'Simulación', callerPhone: '', lat: '-33.4489', lng: '-70.6693' });
    } catch (err: any) {
      toast.error('Error al crear simulación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    const simEmergencies = (emergencies ?? []).filter(
      e => e.observations?.includes('SIMULACIÓN')
    );
    if (simEmergencies.length === 0) {
      toast.info('No hay emergencias de simulación activas');
      return;
    }

    setLoading(true);
    try {
      for (const e of simEmergencies) {
        // Release vehicles
        const { data: evs } = await supabase
          .from('emergency_vehicles')
          .select('vehicle_id')
          .eq('emergency_id', e.id)
          .is('released_at', null);
        if (evs && evs.length > 0) {
          await supabase.from('vehicles').update({ status: 'disponible' as const }).in('id', evs.map(ev => ev.vehicle_id));
          await supabase.from('emergency_vehicles')
            .update({ released_at: new Date().toISOString() })
            .eq('emergency_id', e.id).is('released_at', null);
        }
        await supabase.from('emergencies').update({
          status: 'finalizada' as const,
          finished_at: new Date().toISOString(),
        }).eq('id', e.id);
      }
      toast.success(`${simEmergencies.length} simulación(es) finalizadas`);
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const simCount = (emergencies ?? []).filter(e => e.observations?.includes('SIMULACIÓN')).length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-dispatch" />
          Modo Simulación
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded-full bg-dispatch/15 text-dispatch">
            {simCount} simulación(es) activas
          </span>
        </div>
      </div>

      <div className="console-panel p-4 border-2 border-dispatch/30">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-dispatch" />
          <p className="text-sm text-dispatch font-semibold">
            Las emergencias creadas aquí son ficticias para entrenamiento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Clave de Emergencia</Label>
              <Select value={form.keyId} onValueChange={v => setForm(f => ({ ...f, keyId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar clave..." /></SelectTrigger>
                <SelectContent>
                  {activeKeys.map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: k.color }} />
                      {k.code} - {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dirección</Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Dirección de la emergencia..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nombre informante</Label>
                <Input
                  value={form.callerName}
                  onChange={e => setForm(f => ({ ...f, callerName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={form.callerPhone}
                  onChange={e => setForm(f => ({ ...f, callerPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Latitud</Label>
                <Input
                  value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Longitud</Label>
                <Input
                  value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center">
            <Button onClick={randomize} variant="outline" className="border-dispatch text-dispatch hover:bg-dispatch/10">
              <Zap className="mr-2 h-4 w-4" /> Generar Datos Aleatorios
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-dispatch hover:bg-dispatch/90 text-white">
              <Siren className="mr-2 h-4 w-4" /> Crear Emergencia Ficticia
            </Button>
            <Button onClick={handleClearAll} variant="destructive" disabled={loading || simCount === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Finalizar Todas las Simulaciones ({simCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Active simulations */}
      {simCount > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-dispatch pulse-live" />
            Simulaciones Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(emergencies ?? []).filter(e => e.observations?.includes('SIMULACIÓN')).map(e => (
              <div key={e.id} className="console-panel p-4 border-l-4 border-dispatch">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ background: e.emergency_keys?.color ?? '#7c3aed', color: '#fff' }}
                  >
                    {e.emergency_keys?.code}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.folio}</span>
                </div>
                <p className="text-sm text-foreground font-medium">{e.emergency_keys?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {e.address}
                </p>
                <p className="text-xs text-dispatch mt-2 uppercase font-semibold">{e.status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
