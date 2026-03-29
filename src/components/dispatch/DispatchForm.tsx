import { useState } from 'react';
import { X, MapPin, Phone, User, MessageSquare, Truck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { vehicles } from '@/data/mock-data';
import type { EmergencyKey } from '@/data/mock-data';

interface Props {
  emergencyKey: EmergencyKey;
  onClose: () => void;
  onSubmit: () => void;
}

export default function DispatchForm({ emergencyKey, onClose, onSubmit }: Props) {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const available = vehicles.filter(v => v.status === 'disponible');

  const toggleVehicle = (code: string) => {
    setSelectedVehicles(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tone indicator */}
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-emergency/10 px-3 py-2 text-xs font-mono text-emergency">
          <span className="pulse-live h-2 w-2 rounded-full bg-emergency" />
          Reproduciendo tono: {emergencyKey.name}
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Dirección
              </label>
              <Input placeholder="Ej: Av. Libertador B. O'Higgins 1234" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Referencia
              </label>
              <Input placeholder="Ej: Frente al mall" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Solicitante
              </label>
              <Input placeholder="Nombre del solicitante" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Teléfono
              </label>
              <Input placeholder="+56 9 XXXX XXXX" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 text-xs font-medium text-muted-foreground">Coordenadas</label>
              <Input placeholder="Auto-detectado" disabled className="bg-muted/30 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Observaciones
            </label>
            <Textarea placeholder="Detalles adicionales de la emergencia..." rows={3} className="bg-muted/50" />
          </div>

          {/* Vehicle selection */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Asignar Móviles
            </label>
            <div className="flex flex-wrap gap-2">
              {available.map(v => (
                <button
                  key={v.id}
                  onClick={() => toggleVehicle(v.code)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                    selectedVehicles.includes(v.code)
                      ? 'border-emergency bg-emergency/20 text-emergency'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {v.code} · {v.type}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              <Send className="mr-2 h-4 w-4" />
              Despachar Emergencia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
