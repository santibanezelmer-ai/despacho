import { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Phone, User, MessageSquare, Truck, Send, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { useCompanies } from '@/hooks/useCompanies';
import { sendPushToOrganization } from '@/services/pushService';
import { resolveToneUrl } from '@/lib/toneUrl';
import LocationRequestPanel, { type LocationFix } from './LocationRequestPanel';


// ── Global tone player (survives component unmount) ──
let globalAudio: HTMLAudioElement | null = null;
let globalToneQueue: { url: string; label: string }[] = [];
let globalToneIndex = 0;
let globalOnUpdate: ((playing: boolean, label: string) => void) | null = null;

async function playNextGlobalTone() {
  if (globalToneIndex >= globalToneQueue.length) {
    globalOnUpdate?.(false, '');
    globalToneQueue = [];
    globalToneIndex = 0;
    return;
  }
  const tone = globalToneQueue[globalToneIndex];
  globalOnUpdate?.(true, tone.label);
  const src = (await resolveToneUrl(tone.url)) ?? tone.url;
  const audio = new Audio(src);
  globalAudio = audio;
  audio.onended = () => {
    globalToneIndex++;
    void playNextGlobalTone();
  };
  audio.onerror = () => {
    globalToneIndex++;
    void playNextGlobalTone();
  };
  audio.play().catch(() => {
    globalToneIndex++;
    void playNextGlobalTone();
  });
}

function startGlobalToneSequence(queue: { url: string; label: string }[]) {
  stopGlobalTones();
  if (queue.length === 0) return;
  globalToneQueue = queue;
  globalToneIndex = 0;
  void playNextGlobalTone();
}


function stopGlobalTones() {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio = null;
  }
  globalToneQueue = [];
  globalToneIndex = 0;
  globalOnUpdate?.(false, '');
}

interface Props {
  emergencyKey: EmergencyKeyRow;
  onClose: () => void;
}

export default function DispatchForm({ emergencyKey, onClose }: Props) {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: allVehicles } = useVehicles();
  const { data: companies } = useCompanies();
  const available = (allVehicles ?? []).filter(v => v.status === 'disponible');

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [playingTones, setPlayingTones] = useState(false);
  const [currentTone, setCurrentTone] = useState('');

  // Register/unregister the global callback so UI updates while playing
  useEffect(() => {
    globalOnUpdate = (playing, label) => {
      setPlayingTones(playing);
      setCurrentTone(label);
    };
    return () => { globalOnUpdate = null; };
  }, []);

  const buildToneQueue = useCallback((vehicleIds: string[]) => {
    const companyMap = new Map<string, { tone_url: string | null; name: string; number: number }>();
    for (const vid of vehicleIds) {
      const v = (allVehicles ?? []).find(veh => veh.id === vid);
      if (v?.company_id && !companyMap.has(v.company_id)) {
        const company = (companies ?? []).find(c => c.id === v.company_id);
        if (company) {
          companyMap.set(v.company_id, {
            tone_url: company.tone_url,
            name: company.name,
            number: company.number,
          });
        }
      }
    }

    const sortedCompanies = Array.from(companyMap.values()).sort((a, b) => a.number - b.number);
    const queue: { url: string; label: string }[] = [];

    for (const company of sortedCompanies) {
      if (company.tone_url) {
        queue.push({ url: company.tone_url, label: `Compañía ${company.name}` });
      } else {
        toast.warning(`Compañía ${company.name} no tiene tono configurado`);
      }
    }

    if (emergencyKey.tone_url) {
      queue.push({ url: emergencyKey.tone_url, label: `Clave ${emergencyKey.code}` });
    }

    return queue;
  }, [allVehicles, companies, emergencyKey]);

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create emergency
      const { data: emergency, error: eErr } = await supabase
        .from('emergencies')
        .insert({
          emergency_key_id: emergencyKey.id,
          organization_id: orgId!,
          address: address.trim(),
          reference: reference.trim() || null,
          caller_name: callerName.trim() || null,
          caller_phone: callerPhone.trim() || null,
          observations: observations.trim() || null,
          created_by: user?.id ?? null,
          folio: '',
        })
        .select()
        .single();

      if (eErr) throw eErr;

      // 2. Assign vehicles
      if (selectedVehicleIds.length > 0) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('id, odometer')
          .in('id', selectedVehicleIds);

        const odometerMap = new Map((vehicleData ?? []).map(v => [v.id, v.odometer]));

        const vehicleInserts = selectedVehicleIds.map(vid => ({
          emergency_id: emergency.id,
          vehicle_id: vid,
          organization_id: orgId!,
          odometer_start: odometerMap.get(vid) ?? null,
        }));
        const { error: vErr } = await supabase.from('emergency_vehicles').insert(vehicleInserts);
        if (vErr) throw vErr;

        await supabase
          .from('vehicles')
          .update({ status: 'en_servicio' as const })
          .in('id', selectedVehicleIds);
      }

      // 3. Add log entry
      await supabase.from('emergency_log').insert({
        emergency_id: emergency.id,
        organization_id: orgId!,
        message: `Emergencia despachada: ${emergencyKey.code} - ${emergencyKey.name}`,
        created_by: user?.id ?? null,
      });

      // 4. Build tone queue BEFORE closing — then start global player
      const toneQueue = buildToneQueue(selectedVehicleIds);
      startGlobalToneSequence(toneQueue);

      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      if (import.meta.env.DEV) console.log('[Dispatch] 📤 Calling sendPushToOrganization', { orgId, emergencyId: emergency.id });
      sendPushToOrganization(
        orgId!,
        emergency.id,
        `${emergencyKey.code} — ${emergencyKey.name}`,
        `Dirección: ${address.trim()}`
      ).then(() => { if (import.meta.env.DEV) console.log('[Dispatch] ✓ Push call completed'); })
       .catch(e => { if (import.meta.env.DEV) console.error('[Dispatch] ✗ Push call failed:', e); });

      toast.success(`Emergencia ${emergencyKey.code} despachada correctamente`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al despachar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="console-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-border"
          style={{ borderBottomColor: emergencyKey.color }}
        >
          <div className="flex items-center gap-3">
            <span
              className="rounded px-3 py-1 text-sm font-mono font-bold"
              style={{ backgroundColor: emergencyKey.color, color: '#fff' }}
            >
              {emergencyKey.code}
            </span>
            <h2 className="text-lg font-bold text-foreground">{emergencyKey.name}</h2>
          </div>
          <button onClick={() => { stopGlobalTones(); onClose(); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tone indicator */}
        {playingTones && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-md bg-emergency/10 px-3 py-2 text-xs font-mono text-emergency">
            <div className="flex items-center gap-2">
              <span className="pulse-live h-2 w-2 rounded-full bg-emergency" />
              <Volume2 className="h-3.5 w-3.5" />
              Reproduciendo: {currentTone}
            </div>
            <button onClick={stopGlobalTones} className="hover:text-foreground">
              <VolumeX className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Dirección *
              </label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. Libertador B. O'Higgins 1234" className="bg-muted/50" required />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Referencia
              </label>
              <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: Frente al mall" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Solicitante
              </label>
              <Input value={callerName} onChange={e => setCallerName(e.target.value)} placeholder="Nombre del solicitante" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Teléfono
              </label>
              <Input value={callerPhone} onChange={e => setCallerPhone(e.target.value)} placeholder="+56 9 XXXX XXXX" className="bg-muted/50" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Observaciones
            </label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Detalles adicionales de la emergencia..." rows={3} className="bg-muted/50" />
          </div>

          {/* Vehicle selection */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Asignar Móviles ({selectedVehicleIds.length} seleccionados)
            </label>
            <div className="flex flex-wrap gap-2">
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay móviles disponibles</p>
              ) : (
                available.map(v => (
                  <button
                    key={v.id}
                    onClick={() => toggleVehicle(v.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                      selectedVehicleIds.includes(v.id)
                        ? 'border-emergency bg-emergency/20 text-emergency'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {v.code} · {v.type}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !address.trim()}
              className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Despachar Emergencia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
