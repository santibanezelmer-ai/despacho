import { useState, useRef, useEffect } from 'react';
import { MapPin, Truck, Shield, Megaphone, Cross, Save, X, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVehicles } from '@/hooks/useVehicles';
import { useUpdateAddress, useUpdateLocation, useAssignVehicles, useToggleFlag } from '@/hooks/useEmergencyActions';
import { usePlaySystemSound } from '@/hooks/useSystemSounds';
import { toast } from 'sonner';

interface Emergency {
  id: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  external_support?: boolean;
  declared?: boolean;
  carabineros_requested?: boolean;
  ambulance_requested?: boolean;
  vehicleCodes: string[];
  status: string;
}

interface Props {
  emergency: Emergency;
  assignedVehicleIds: string[];
  onClose: () => void;
}

export default function EmergencyActionsPanel({ emergency, assignedVehicleIds, onClose }: Props) {
  const [editAddress, setEditAddress] = useState(emergency.address);
  const [showMap, setShowMap] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(
    emergency.latitude && emergency.longitude ? { lat: emergency.latitude, lng: emergency.longitude } : null
  );

  const { data: allVehicles } = useVehicles();
  const available = (allVehicles ?? []).filter(
    v => v.status === 'disponible' && !assignedVehicleIds.includes(v.id)
  );
  const [selectedNewVehicles, setSelectedNewVehicles] = useState<string[]>([]);

  const updateAddress = useUpdateAddress();
  const updateLocation = useUpdateLocation();
  const assignVehicles = useAssignVehicles();
  const toggleFlag = useToggleFlag();
  const playSystemSound = usePlaySystemSound();

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Init mini map
  useEffect(() => {
    if (!showMap || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const center = mapCoords ?? { lat: -33.45, lng: -70.65 };
    const map = L.map(mapRef.current, { zoomControl: true }).setView([center.lat, center.lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB',
    }).addTo(map);

    if (mapCoords) {
      markerRef.current = L.marker([mapCoords.lat, mapCoords.lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        setMapCoords({ lat: pos.lat, lng: pos.lng });
      });
    }

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setMapCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          setMapCoords({ lat: pos.lat, lng: pos.lng });
        });
      }
    });

    leafletMapRef.current = map;
    return () => { map.remove(); leafletMapRef.current = null; };
  }, [showMap]);

  const handleSaveAddress = () => {
    if (!editAddress.trim()) return;
    updateAddress.mutate({ id: emergency.id, address: editAddress.trim() });
  };

  const handleSaveLocation = () => {
    if (!mapCoords) return;
    updateLocation.mutate({ id: emergency.id, latitude: mapCoords.lat, longitude: mapCoords.lng });
    setShowMap(false);
  };

  const handleAssignVehicles = () => {
    if (selectedNewVehicles.length === 0) return;
    assignVehicles.mutate({ emergencyId: emergency.id, vehicleIds: selectedNewVehicles });
    setSelectedNewVehicles([]);
  };

  const handleToggle = (field: string, currentValue: boolean, label: string) => {
    toggleFlag.mutate({ id: emergency.id, field, value: !currentValue, label });
    if (field === 'declared' && !currentValue) {
      // Play declared sound
      try {
        const audio = new Audio('/tones/declared.mp3');
        audio.play().catch(() => {});
      } catch {}
      toast.success('🔊 Emergencia declarada');
    }
  };

  const extSupport = emergency.external_support ?? false;
  const declared = emergency.declared ?? false;
  const carabineros = emergency.carabineros_requested ?? false;
  const ambulance = emergency.ambulance_requested ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="console-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Acciones — {emergency.address}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* 1. Edit Address */}
          <section>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Editar Dirección
            </label>
            <div className="flex gap-2">
              <Input
                value={editAddress}
                onChange={e => setEditAddress(e.target.value)}
                className="bg-muted/50 flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveAddress}
                disabled={updateAddress.isPending || editAddress.trim() === emergency.address}
              >
                {updateAddress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </section>

          {/* 2. Assign More Vehicles */}
          <section>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Asignar Móviles Adicionales
            </label>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay móviles disponibles</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {available.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedNewVehicles(prev =>
                        prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]
                      )}
                      className={`rounded-md border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                        selectedNewVehicles.includes(v.id)
                          ? 'border-emergency bg-emergency/20 text-emergency'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30'
                      }`}
                    >
                      {v.code} · {v.type}
                    </button>
                  ))}
                </div>
                {selectedNewVehicles.length > 0 && (
                  <Button size="sm" onClick={handleAssignVehicles} disabled={assignVehicles.isPending}>
                    {assignVehicles.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Truck className="mr-1 h-4 w-4" />}
                    Asignar ({selectedNewVehicles.length})
                  </Button>
                )}
              </>
            )}
          </section>

          {/* 3. Map Location */}
          <section>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Navigation className="h-3.5 w-3.5" /> Ubicación en Mapa
            </label>
            {emergency.latitude && emergency.longitude && !showMap && (
              <p className="text-xs text-muted-foreground mb-1">
                📍 {emergency.latitude.toFixed(5)}, {emergency.longitude.toFixed(5)}
              </p>
            )}
            {!showMap ? (
              <Button variant="outline" size="sm" onClick={() => setShowMap(true)}>
                <MapPin className="mr-1 h-4 w-4" />
                {emergency.latitude ? 'Editar ubicación' : 'Asignar ubicación en mapa'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div ref={mapRef} className="h-56 w-full rounded-md border border-border" style={{ isolation: 'isolate' }} />
                {mapCoords && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMap(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveLocation} disabled={!mapCoords || updateLocation.isPending}>
                    {updateLocation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Guardar Ubicación
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 4. Action Buttons Grid */}
          <section>
            <label className="mb-2 text-xs font-medium text-muted-foreground">Acciones Operativas</label>
            <div className="grid grid-cols-2 gap-2">
              {/* 10-12 External Support */}
              <button
                onClick={() => handleToggle('external_support', extSupport, '10-12 Apoyo externo')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                  extSupport
                    ? 'border-warning bg-warning/20 text-warning'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-warning/50'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>10-12 — Apoyo Externo</span>
              </button>

              {/* Declared */}
              <button
                onClick={() => handleToggle('declared', declared, 'Declarado')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                  declared
                    ? 'border-emergency bg-emergency/20 text-emergency'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-emergency/50'
                }`}
              >
                <Megaphone className="h-4 w-4" />
                <span>Declarado</span>
              </button>

              {/* Carabineros */}
              <button
                onClick={() => handleToggle('carabineros_requested', carabineros, '1-0 Carabineros')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                  carabineros
                    ? 'border-info bg-info/20 text-info'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-info/50'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>1-0 — Carabineros</span>
              </button>

              {/* Ambulance */}
              <button
                onClick={() => handleToggle('ambulance_requested', ambulance, '1-2 Ambulancia')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                  ambulance
                    ? 'border-success bg-success/20 text-success'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-success/50'
                }`}
              >
                <Cross className="h-4 w-4" />
                <span>1-2 — Ambulancia</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
