import { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Phone, User, MessageSquare, Truck, Send, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { useCompanies } from '@/hooks/useCompanies';
import { getPlayableToneSrc } from '@/services/toneCache';
import { enqueueDispatch, isNetworkError, performDispatch, type PendingDispatch } from '@/services/offlineDispatchQueue';
import { useScreenTheme } from '@/hooks/useScreenTheme';
import LocationRequestPanel, { type LocationFix } from './LocationRequestPanel';
import ManualCoordsInput from './ManualCoordsInput';
import TerritoryStatus from './TerritoryStatus';

import { DISPATCH_DRAFT_KEY } from '@/contexts/DispatchFormContext';

type DispatchDraft = {
  keyId: string;
  selectedVehicleIds: string[];
  address: string;
  reference: string;
  callerName: string;
  callerPhone: string;
  observations: string;
  locationRequestId: string | null;
  locationFix: LocationFix | null;
};

function loadDraft(keyId: string): Partial<DispatchDraft> {
  try {
    const raw = sessionStorage.getItem(DISPATCH_DRAFT_KEY);
    if (!raw) return {};
    const d = JSON.parse(raw) as DispatchDraft;
    return d.keyId === keyId ? d : {};
  } catch {
    // Borrador corrupto o almacenamiento no disponible: se abre limpio
    return {};
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DISPATCH_DRAFT_KEY);
  } catch {
    // Almacenamiento no disponible: nada que limpiar
  }
}


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
  const src = await getPlayableToneSrc(tone.url);
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

// ── Claves de salida autorizada / otros servicios (10-9 y similares) ──
const AUTHORIZED_SERVICE_TERMS = [
  'otros servicios',
  'otro servicio',
  'servicio especial',
  'servicios especiales',
  'traslado',
  'salida autorizada',
];

const AUTHORIZER_RANKS = [
  'Superintendente',
  'Comandante',
  '2° Comandante',
  'Capitán',
  'Oficial de Guardia',
];

function isAuthorizedServiceKey(key: { code: string; name: string }): boolean {
  const code = (key.code ?? '').replace(/\s/g, '').toLowerCase();
  if (code === '10-9' || code === '109') return true;
  const name = (key.name ?? '').toLowerCase();
  return AUTHORIZED_SERVICE_TERMS.some(term => name.includes(term));
}

interface Props {
  emergencyKey: EmergencyKeyRow;
  onClose: () => void;
}

export default function DispatchForm({ emergencyKey, onClose }: Props) {
  const { theme } = useScreenTheme('operix.despacho.theme');
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: allVehicles } = useVehicles();
  const { data: companies } = useCompanies();
  const { data: volunteers } = useVolunteers();
  const available = (allVehicles ?? []).filter(v => v.status === 'disponible');
  const isServiceKey = isAuthorizedServiceKey(emergencyKey);

  const [draft] = useState(() => loadDraft(emergencyKey.id));
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(draft.selectedVehicleIds ?? []);
  const [address, setAddress] = useState(draft.address ?? '');
  const [reference, setReference] = useState(draft.reference ?? '');
  const [callerName, setCallerName] = useState(draft.callerName ?? '');
  const [callerPhone, setCallerPhone] = useState(draft.callerPhone ?? '');
  const [observations, setObservations] = useState(draft.observations ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [playingTones, setPlayingTones] = useState(false);
  const [currentTone, setCurrentTone] = useState('');
  const [authorizerJustPicked, setAuthorizerJustPicked] = useState(false);
  const [locationRequestId, setLocationRequestId] = useState<string | null>(draft.locationRequestId ?? null);
  const [locationFix, setLocationFix] = useState<LocationFix | null>(draft.locationFix ?? null);

  // Mantener el borrador de la ventana aunque se navegue o se cierre el navegador
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DISPATCH_DRAFT_KEY,
        JSON.stringify({
          keyId: emergencyKey.id,
          selectedVehicleIds,
          address,
          reference,
          callerName,
          callerPhone,
          observations,
          locationRequestId,
          locationFix,
        } satisfies DispatchDraft)
      );
    } catch {
      // Almacenamiento no disponible: el formulario sigue en memoria
    }
  }, [emergencyKey.id, selectedVehicleIds, address, reference, callerName, callerPhone, observations, locationRequestId, locationFix]);

  const handleLocationFix = useCallback((fix: LocationFix) => {
    setLocationFix(fix);
    setAddress(prev =>
      prev.trim()
        ? prev
        : fix.address ?? `${fix.latitude.toFixed(6)}, ${fix.longitude.toFixed(6)}`
    );
    toast.success('Ubicación recibida correctamente.');
  }, []);

  const handleManualCoords = useCallback((lat: number, lng: number) => {
    setLocationFix({
      latitude: lat,
      longitude: lng,
      accuracy: null,
      receivedAt: new Date().toISOString(),
      address: null,
    });
    setAddress(prev => (prev.trim() ? prev : `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
    toast.success('Coordenadas manuales asignadas');
  }, []);



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

  // El propio campo "Autorizado por" actúa como buscador de personal (un solo input)
  const authorizerMatches = (() => {
    if (!isServiceKey || authorizerJustPicked) return [];
    const q = callerName.trim().toLowerCase();
    if (q.length < 2) return [];
    return (volunteers ?? [])
      .filter((v: any) => {
        const name = (v.name ?? '').toLowerCase();
        const code = String(v.code ?? v.internal_id ?? v.registration_number ?? '').toLowerCase();
        const rut = String(v.rut ?? '').toLowerCase();
        return name.includes(q) || (code && code.includes(q)) || (rut && rut.includes(q));
      })
      .slice(0, 6);
  })();

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
    const payload: PendingDispatch = {
      clientId: crypto.randomUUID(),
      orgId: orgId!,
      userId: user?.id ?? null,
      keyId: emergencyKey.id,
      keyCode: emergencyKey.code,
      keyName: emergencyKey.name,
      address: address.trim(),
      reference: reference.trim() || null,
      callerName: callerName.trim() || null,
      callerPhone: callerPhone.trim() || null,
      observations: observations.trim() || null,
      latitude: locationFix?.latitude ?? null,
      longitude: locationFix?.longitude ?? null,
      locationRequestId,
      vehicleIds: selectedVehicleIds,
      vehicleLabels: selectedVehicleIds.map(id => (allVehicles ?? []).find(v => v.id === id)?.code ?? '').filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    const toneQueue = buildToneQueue(selectedVehicleIds);

    const queueOffline = () => {
      enqueueDispatch(payload);
      startGlobalToneSequence(toneQueue);
      toast.warning(`Sin conexión: ${emergencyKey.code} despachada localmente. Se enviará al volver internet.`);
      clearDraft();
      onClose();
    };

    try {
      if (!navigator.onLine) {
        queueOffline();
        return;
      }
      await performDispatch(payload);
      startGlobalToneSequence(toneQueue);

      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      toast.success(`Emergencia ${emergencyKey.code} despachada correctamente`);
      clearDraft();
      onClose();
    } catch (err: any) {
      if (isNetworkError(err)) {
        queueOffline();
      } else {
        toast.error(err.message || 'Error al despachar');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-theme={theme} className="theme-screen fixed inset-0 z-50 flex items-center justify-center bg-background/80 text-foreground backdrop-blur-sm">
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
          <button onClick={() => { stopGlobalTones(); clearDraft(); onClose(); }} className="text-muted-foreground hover:text-foreground">
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
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. Libertador B. O'Higgins 1234" className="bg-muted/50" required spellCheck lang="es-CL" autoCorrect="off" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Referencia
              </label>
              <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: Frente al mall" className="bg-muted/50" spellCheck lang="es-CL" autoCorrect="off" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> {isServiceKey ? 'Autorizado por' : 'Solicitante'}
              </label>
              <div className="relative">
                <Input
                  value={callerName}
                  onChange={e => {
                    setCallerName(e.target.value);
                    setAuthorizerJustPicked(false);
                  }}
                  placeholder={isServiceKey ? 'Nombre, cargo o ID de personal…' : 'Nombre del solicitante'}
                  className="bg-muted/50"
                  spellCheck={false}
                  autoCorrect="off"
                  autoComplete="off"
                />
                {authorizerMatches.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                    {authorizerMatches.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          setCallerName(v.name);
                          setAuthorizerJustPicked(true);
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted/60"
                      >
                        <span className="font-medium">{v.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {[v.code, v.rut].filter(Boolean).join(' · ') || ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isServiceKey && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {AUTHORIZER_RANKS.map(rank => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => setCallerName(prev => (prev.trim() ? prev : `${rank} `))}
                      className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      {rank}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Teléfono
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input value={callerPhone} onChange={e => setCallerPhone(e.target.value)} placeholder="+56 9 XXXX XXXX" className="bg-muted/50 sm:flex-1" />
                <div className="sm:w-[190px]">
                  <LocationRequestPanel
                    phone={callerPhone}
                    requestId={locationRequestId}
                    onRequestCreated={setLocationRequestId}
                    fix={locationFix}
                    onFix={handleLocationFix}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <ManualCoordsInput
                latitude={locationFix?.latitude ?? null}
                longitude={locationFix?.longitude ?? null}
                onSubmit={handleManualCoords}
              />
              {locationFix && <div className="mt-2"><TerritoryStatus latitude={locationFix.latitude} longitude={locationFix.longitude} /></div>}
            </div>


          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {isServiceKey ? 'Motivo del servicio' : 'Observaciones'}
            </label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              onFocus={() => {
                if (isServiceKey && !observations.trim()) setObservations('Motivo: ');
              }}
              placeholder={isServiceKey ? 'Motivo del servicio, destino o instrucción de la salida...' : 'Detalles adicionales de la emergencia...'}
              rows={3}
              className="bg-muted/50"
              spellCheck
              lang="es-CL"
              autoCorrect="off"
            />
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
            <Button variant="outline" onClick={() => { clearDraft(); onClose(); }} className="flex-1" disabled={submitting}>
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
