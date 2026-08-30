import { useState } from 'react';
import { Smartphone, Plus, Copy, Ban, Trash2, Truck, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useVehicleDevices, useVehicleDeviceCodes, useVehicleDeviceActions } from '@/hooks/useVehicleDevices';
import { useVehicleLastPositions, formatPositionAge, isPositionStale } from '@/hooks/useVehiclePositions';

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 hora' },
  { value: '6', label: '6 horas' },
  { value: '24', label: '24 horas' },
  { value: '72', label: '3 días' },
];

export default function VehicleDevicesAdmin() {
  const { isOrgAdmin } = useOrganization();
  const { data: devices = [] } = useVehicleDevices();
  const { data: codes = [] } = useVehicleDeviceCodes();
  const { data: positions = [] } = useVehicleLastPositions({ refetchInterval: 10000 });
  const { generateCode, revokeDevice, cancelCode } = useVehicleDeviceActions();

  const [label, setLabel] = useState('');
  const [hours, setHours] = useState('24');
  const [toRevoke, setToRevoke] = useState<string | null>(null);

  if (!isOrgAdmin) return null;

  const posByVehicle = new Map(positions.map((p) => [p.vehicle_id, p]));

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado', description: code });
    } catch {
      toast({ title: 'No se pudo copiar', description: code, variant: 'destructive' });
    }
  };

  const handleGenerate = async () => {
    try {
      const created = await generateCode.mutateAsync({ label, hours: Number(hours) });
      setLabel('');
      toast({ title: 'Código generado', description: `${created.code} — de un solo uso` });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Smartphone className="h-4 w-4 text-primary" />
          Dispositivos Operix Móvil
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dispositivos instalados en los móviles de esta organización. Se activan con un código
          temporal de un solo uso y luego se asocian a un móvil registrado.
        </p>
      </div>

      {/* Generar código */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="device-label" className="text-xs">Referencia (opcional)</Label>
          <Input
            id="device-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tablet B-1"
            maxLength={60}
          />
        </div>
        <div className="w-full space-y-1 sm:w-40">
          <Label className="text-xs">Vigencia</Label>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={generateCode.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Generar código
        </Button>
      </div>

      {/* Códigos vigentes */}
      {codes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Códigos vigentes sin usar</p>
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-base font-bold tracking-widest text-foreground">{c.code}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.label ? `${c.label} · ` : ''}vence {new Date(c.expires_at).toLocaleString('es-CL')}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => copy(c.code)} title="Copiar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => cancelCode.mutate(c.id)}
                  title="Anular código"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispositivos autorizados */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Dispositivos autorizados</p>
        {devices.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Aún no hay dispositivos activados.
          </p>
        ) : (
          devices.map((d) => {
            const pos = d.vehicle_id ? posByVehicle.get(d.vehicle_id) : undefined;
            const stale = pos ? isPositionStale(pos.captured_at) : false;
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{d.name}</span>
                    <Badge variant={d.status === 'active' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {d.status === 'active' ? 'Activo' : 'Revocado'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {d.vehicles?.code ?? 'Sin móvil asociado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {d.last_seen_at ? `visto ${formatPositionAge(d.last_seen_at)}` : 'sin conexión registrada'}
                    </span>
                    {pos && (
                      <span className={`flex items-center gap-1 ${stale ? 'text-warning' : 'text-success'}`}>
                        {stale && <AlertTriangle className="h-3 w-3" />}
                        GPS {formatPositionAge(pos.captured_at)}
                        {stale ? ' (desactualizado)' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {d.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => setToRevoke(d.id)}>
                    <Ban className="mr-1 h-3.5 w-3.5" />
                    Revocar
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!toRevoke} onOpenChange={(o) => !o && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar este dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              El dispositivo dejará de poder enviar ubicación y perderá la asociación con su móvil.
              Deberá activarse nuevamente con un código nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toRevoke) revokeDevice.mutate(toRevoke);
                setToRevoke(null);
              }}
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
