import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { useVehicleProfile, daysUntil, expiryLevel, maintenanceAlert } from '@/hooks/useVehicleProfile';
import { toast } from 'sonner';
import {
  Truck, ClipboardCheck, NotebookPen, Siren, Gauge,
  Loader2, Plus, Trash2, AlertTriangle,
} from 'lucide-react';

export const VEHICLE_STATUS_META: Record<string, { label: string; icon: string; color: string }> = {
  disponible: { label: 'Disponible', icon: '🟢', color: 'hsl(145, 65%, 42%)' },
  en_servicio: { label: 'En emergencia', icon: '🚨', color: 'hsl(0, 85%, 55%)' },
  mantencion: { label: 'Mantenimiento', icon: '🟡', color: 'hsl(35, 95%, 55%)' },
  fuera_servicio: { label: 'Fuera de servicio', icon: '🔴', color: 'hsl(0, 0%, 50%)' },
};

const DOC_TYPES = [
  { value: 'permiso_circulacion', label: 'Permiso de circulación' },
  { value: 'revision_tecnica', label: 'Revisión técnica' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'otro', label: 'Otro documento' },
];
const DOC_LABEL = Object.fromEntries(DOC_TYPES.map(d => [d.value, d.label]));

const CHECKLIST_ITEMS = [
  'Combustible', 'Agua / estanque', 'Luces y sirena', 'Radio', 'Neumáticos',
  'Mangueras y pitones', 'Herramientas', 'Equipos de respiración', 'Botiquín', 'Aseo del móvil',
];

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: any | null;
}

export default function VehicleProfileDialog({ open, onClose, vehicle }: Props) {
  const { orgId } = useOrganization();
  const { canWrite } = useAuth();
  const qc = useQueryClient();
  const { formatDateTime } = useTimeFormat();
  const { maintenance, documents, checklists, logbook } = useVehicleProfile(open ? vehicle?.id : null);

  const [savingOps, setSavingOps] = useState(false);
  const [ops, setOps] = useState<{ odometer: string; fuel: string } | null>(null);

  const [mForm, setMForm] = useState<any>(null);
  const [dForm, setDForm] = useState<any>(null);
  const [cForm, setCForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  if (!vehicle) return null;

  const st = VEHICLE_STATUS_META[vehicle.status] ?? VEHICLE_STATUS_META.disponible;
  const date = (v?: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('es-CL') : '—');
  const dt = (v?: string | null) => (v ? formatDateTime(v) : '—');

  const trips = logbook.data ?? [];
  const activeTrip = trips.find((t: any) => !t.released_at) ?? null;
  const mAlert = maintenanceAlert(maintenance.data, vehicle.odometer);
  const expiring = (documents.data ?? []).filter(d => expiryLevel(d.expires_at) !== 'ok');

  const crewOf = (trip: any) => (trip?.emergency_personnel ?? []) as any[];
  const driverOf = (trip: any) =>
    crewOf(trip).find(p => (p.role ?? '').toLowerCase().includes('conductor'))?.volunteers ?? null;

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key, vehicle.id] });

  const saveOps = async () => {
    setSavingOps(true);
    const payload: any = { fuel_updated_at: new Date().toISOString() };
    if (ops?.odometer !== '') payload.odometer = parseInt(ops!.odometer);
    if (ops?.fuel !== '') payload.fuel_level = Math.max(0, Math.min(100, parseInt(ops!.fuel)));
    const { error } = await (supabase as any).from('vehicles').update(payload).eq('id', vehicle.id);
    setSavingOps(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Información operacional actualizada');
    setOps(null);
    qc.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const saveMaintenance = async () => {
    if (!mForm.maintenance_type?.trim()) { toast.error('Indica el tipo de mantención'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('vehicle_maintenance').insert({
      organization_id: orgId!,
      vehicle_id: vehicle.id,
      service_date: mForm.service_date || new Date().toISOString().slice(0, 10),
      odometer: mForm.odometer ? parseInt(mForm.odometer) : vehicle.odometer ?? null,
      maintenance_type: mForm.maintenance_type.trim(),
      provider: mForm.provider?.trim() || null,
      cost: mForm.cost ? Number(mForm.cost) : null,
      next_service_date: mForm.next_service_date || null,
      next_service_odometer: mForm.next_service_odometer ? parseInt(mForm.next_service_odometer) : null,
      notes: mForm.notes?.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mantención registrada');
    setMForm(null);
    invalidate('vehicle-maintenance');
  };

  const saveDocument = async () => {
    if (!dForm.doc_type) { toast.error('Selecciona el tipo de documento'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('vehicle_documents').insert({
      organization_id: orgId!,
      vehicle_id: vehicle.id,
      doc_type: dForm.doc_type,
      doc_number: dForm.doc_number?.trim() || null,
      issued_at: dForm.issued_at || null,
      expires_at: dForm.expires_at || null,
      file_url: dForm.file_url?.trim() || null,
      notes: dForm.notes?.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Documento registrado');
    setDForm(null);
    invalidate('vehicle-documents');
  };

  const saveChecklist = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('vehicle_checklists').insert({
      organization_id: orgId!,
      vehicle_id: vehicle.id,
      emergency_id: cForm.emergency_id || null,
      kind: cForm.kind,
      items: CHECKLIST_ITEMS.map(name => ({ name, ok: !!cForm.checked[name] })),
      odometer: cForm.odometer ? parseInt(cForm.odometer) : vehicle.odometer ?? null,
      fuel_level: cForm.fuel_level ? parseInt(cForm.fuel_level) : vehicle.fuel_level ?? null,
      notes: cForm.notes?.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Checklist guardado');
    setCForm(null);
    invalidate('vehicle-checklists');
  };

  const remove = async (table: string, id: string, key: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Registro eliminado'); invalidate(key); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Truck className="h-4 w-4 text-info" />
            <span className="font-mono">{vehicle.code}</span>
            <span className="text-sm text-muted-foreground font-normal">{vehicle.type}</span>
            <span className="status-badge" style={{ backgroundColor: `${st.color}20`, color: st.color }}>
              {st.icon} {st.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {(mAlert.message || expiring.length > 0) && (
          <div className="space-y-1.5">
            {mAlert.message && (
              <AlertLine level={mAlert.level} text={`${mAlert.message}${mAlert.next?.next_service_date ? ` — ${date(mAlert.next.next_service_date)}` : ''}${mAlert.next?.next_service_odometer ? ` / ${mAlert.next.next_service_odometer.toLocaleString()} km` : ''}`} />
            )}
            {expiring.map(d => (
              <AlertLine
                key={d.id}
                level={expiryLevel(d.expires_at)}
                text={`${DOC_LABEL[d.doc_type] ?? d.doc_type}: ${
                  (daysUntil(d.expires_at) ?? 0) < 0 ? 'vencido el' : 'vence el'
                } ${date(d.expires_at)}`}
              />
            ))}
          </div>
        )}

        <Tabs defaultValue="datos">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto text-[11px]">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="mantenimiento">Mantención</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
          </TabsList>

          {/* DATOS */}
          <TabsContent value="datos" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="Código" value={vehicle.code} />
              <Field label="Tipo" value={vehicle.type} />
              <Field label="Compañía" value={vehicle.companies?.name} />
              <Field label="Marca / Modelo" value={[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null} />
              <Field label="Año" value={vehicle.year} />
              <Field label="Patente" value={vehicle.plate} />
              <Field label="Capacidad" value={vehicle.capacity} />
              <Field label="Estado" value={`${st.icon} ${st.label}`} />
              <Field label="Kilometraje" value={vehicle.odometer != null ? `${vehicle.odometer.toLocaleString()} km` : null} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Salidas registradas" value={trips.length} />
              <Stat label="Mantenciones" value={(maintenance.data ?? []).length} />
              <Stat label="Documentos" value={(documents.data ?? []).length} />
            </div>
          </TabsContent>

          {/* OPERACIONAL */}
          <TabsContent value="operacional" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field label="Kilometraje actual" value={vehicle.odometer != null ? `${vehicle.odometer.toLocaleString()} km` : null} />
              <Field label="Combustible" value={vehicle.fuel_level != null ? `${vehicle.fuel_level}%` : null} />
              <Field label="Última actualización" value={dt(vehicle.fuel_updated_at ?? vehicle.updated_at)} />
              <Field label="Estado" value={`${st.icon} ${st.label}`} />
            </div>

            {vehicle.fuel_level != null && (
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, vehicle.fuel_level))}%`,
                    backgroundColor: vehicle.fuel_level < 25 ? 'hsl(0, 85%, 55%)' : vehicle.fuel_level < 50 ? 'hsl(35, 95%, 55%)' : 'hsl(145, 65%, 42%)',
                  }}
                />
              </div>
            )}

            <div className="console-panel p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Siren className="h-3.5 w-3.5 text-emergency" /> Personal asignado (Operaciones)
              </p>
              {activeTrip ? (
                <div className="space-y-1.5 text-xs">
                  <p className="text-muted-foreground">
                    Emergencia <span className="font-mono text-foreground">{activeTrip.emergencies?.folio}</span> · 6-0:{' '}
                    <span className="text-foreground">{activeTrip.volunteer_count ?? 0}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Conductor: <span className="text-foreground">{driverOf(activeTrip)?.name ?? '—'}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {crewOf(activeTrip).map(p => (
                      <Badge key={p.id} variant="outline" className="text-[10px]">
                        {p.volunteers?.code ? `${p.volunteers.code} · ` : ''}{p.volunteers?.name}{p.role ? ` (${p.role})` : ''}
                      </Badge>
                    ))}
                    {!crewOf(activeTrip).length && <span className="text-muted-foreground">Sin personal registrado</span>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">El móvil no está asignado a una emergencia activa.</p>
              )}
            </div>

            {canWrite && (
              ops ? (
                <div className="console-panel p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Kilometraje</Label>
                      <Input type="number" value={ops.odometer} onChange={e => setOps({ ...ops, odometer: e.target.value })} className="bg-muted/50" />
                    </div>
                    <div>
                      <Label className="text-xs">Combustible (%)</Label>
                      <Input type="number" min={0} max={100} value={ops.fuel} onChange={e => setOps({ ...ops, fuel: e.target.value })} className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setOps(null)}>Cancelar</Button>
                    <Button size="sm" className="flex-1" onClick={saveOps} disabled={savingOps}>
                      {savingOps && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setOps({ odometer: vehicle.odometer?.toString() ?? '', fuel: vehicle.fuel_level?.toString() ?? '' })}>
                  <Gauge className="mr-1.5 h-3.5 w-3.5" /> Actualizar km / combustible
                </Button>
              )
            )}
          </TabsContent>

          {/* MANTENIMIENTO */}
          <TabsContent value="mantenimiento" className="space-y-3 pt-4">
            {canWrite && !mForm && (
              <Button size="sm" variant="outline" onClick={() => setMForm({ service_date: '', odometer: vehicle.odometer?.toString() ?? '', maintenance_type: '', provider: '', cost: '', next_service_date: '', next_service_odometer: '', notes: '' })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar mantención
              </Button>
            )}
            {mForm && (
              <div className="console-panel p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Fecha</Label><Input type="date" value={mForm.service_date} onChange={e => setMForm({ ...mForm, service_date: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Kilometraje</Label><Input type="number" value={mForm.odometer} onChange={e => setMForm({ ...mForm, odometer: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Tipo *</Label><Input value={mForm.maintenance_type} onChange={e => setMForm({ ...mForm, maintenance_type: e.target.value })} placeholder="Preventiva, frenos..." className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Taller / proveedor</Label><Input value={mForm.provider} onChange={e => setMForm({ ...mForm, provider: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Próxima mantención</Label><Input type="date" value={mForm.next_service_date} onChange={e => setMForm({ ...mForm, next_service_date: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Próxima a los (km)</Label><Input type="number" value={mForm.next_service_odometer} onChange={e => setMForm({ ...mForm, next_service_odometer: e.target.value })} className="bg-muted/50" /></div>
                </div>
                <Textarea value={mForm.notes} onChange={e => setMForm({ ...mForm, notes: e.target.value })} placeholder="Observaciones" className="bg-muted/50 text-sm" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setMForm(null)}>Cancelar</Button>
                  <Button size="sm" className="flex-1" onClick={saveMaintenance} disabled={saving}>
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Guardar
                  </Button>
                </div>
              </div>
            )}
            {maintenance.isLoading ? <Skeleton className="h-20" /> : (maintenance.data ?? []).length ? (
              (maintenance.data ?? []).map(m => (
                <div key={m.id} className="console-panel p-3 text-xs space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{m.maintenance_type}</p>
                    {canWrite && (
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => remove('vehicle_maintenance', m.id, 'vehicle-maintenance')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {date(m.service_date)}
                    {m.odometer != null && ` · ${m.odometer.toLocaleString()} km`}
                    {m.provider && ` · ${m.provider}`}
                    {m.cost != null && ` · $${Number(m.cost).toLocaleString('es-CL')}`}
                  </p>
                  {(m.next_service_date || m.next_service_odometer) && (
                    <p className="text-warning">
                      Próxima: {m.next_service_date ? date(m.next_service_date) : '—'}
                      {m.next_service_odometer ? ` / ${m.next_service_odometer.toLocaleString()} km` : ''}
                    </p>
                  )}
                  {m.notes && <p className="text-muted-foreground">{m.notes}</p>}
                </div>
              ))
            ) : <Empty text="Sin mantenciones registradas" />}
          </TabsContent>

          {/* DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-3 pt-4">
            {canWrite && !dForm && (
              <Button size="sm" variant="outline" onClick={() => setDForm({ doc_type: 'permiso_circulacion', doc_number: '', issued_at: '', expires_at: '', file_url: '', notes: '' })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar documento
              </Button>
            )}
            {dForm && (
              <div className="console-panel p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={dForm.doc_type} onValueChange={v => setDForm({ ...dForm, doc_type: v })}>
                      <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Número</Label><Input value={dForm.doc_number} onChange={e => setDForm({ ...dForm, doc_number: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Emisión</Label><Input type="date" value={dForm.issued_at} onChange={e => setDForm({ ...dForm, issued_at: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Vencimiento</Label><Input type="date" value={dForm.expires_at} onChange={e => setDForm({ ...dForm, expires_at: e.target.value })} className="bg-muted/50" /></div>
                </div>
                <Textarea value={dForm.notes} onChange={e => setDForm({ ...dForm, notes: e.target.value })} placeholder="Observaciones" className="bg-muted/50 text-sm" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setDForm(null)}>Cancelar</Button>
                  <Button size="sm" className="flex-1" onClick={saveDocument} disabled={saving}>
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Guardar
                  </Button>
                </div>
              </div>
            )}
            {documents.isLoading ? <Skeleton className="h-20" /> : (documents.data ?? []).length ? (
              (documents.data ?? []).map(d => {
                const lvl = expiryLevel(d.expires_at);
                return (
                  <div key={d.id} className="console-panel p-3 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{DOC_LABEL[d.doc_type] ?? d.doc_type}</p>
                      <div className="flex items-center gap-1">
                        {d.expires_at && (
                          <span className={`status-badge ${lvl === 'danger' ? 'bg-emergency/20 text-emergency' : lvl === 'warning' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                            {lvl === 'danger' ? 'Vencido' : lvl === 'warning' ? `${daysUntil(d.expires_at)} días` : 'Vigente'}
                          </span>
                        )}
                        {canWrite && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => remove('vehicle_documents', d.id, 'vehicle-documents')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      {d.doc_number ? `N° ${d.doc_number} · ` : ''}Emisión {date(d.issued_at)} · Vence {date(d.expires_at)}
                    </p>
                    {d.notes && <p className="text-muted-foreground">{d.notes}</p>}
                  </div>
                );
              })
            ) : <Empty text="Sin documentos registrados" />}
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="space-y-3 pt-4">
            {canWrite && !cForm && (
              <div className="flex gap-2">
                {(['salida', 'regreso'] as const).map(kind => (
                  <Button key={kind} size="sm" variant="outline" onClick={() => setCForm({
                    kind,
                    checked: {},
                    odometer: vehicle.odometer?.toString() ?? '',
                    fuel_level: vehicle.fuel_level?.toString() ?? '',
                    notes: '',
                    emergency_id: activeTrip?.emergencies?.id ?? '',
                  })}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Checklist de {kind}
                  </Button>
                ))}
              </div>
            )}
            {cForm && (
              <div className="console-panel p-3 space-y-3">
                <p className="text-xs font-semibold">
                  Checklist de {cForm.kind}
                  {cForm.emergency_id && activeTrip?.emergencies?.folio && (
                    <span className="text-muted-foreground"> · emergencia {activeTrip.emergencies.folio}</span>
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CHECKLIST_ITEMS.map(item => (
                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={!!cForm.checked[item]}
                        onCheckedChange={v => setCForm({ ...cForm, checked: { ...cForm.checked, [item]: !!v } })}
                      />
                      {item}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Kilometraje</Label><Input type="number" value={cForm.odometer} onChange={e => setCForm({ ...cForm, odometer: e.target.value })} className="bg-muted/50" /></div>
                  <div><Label className="text-xs">Combustible (%)</Label><Input type="number" value={cForm.fuel_level} onChange={e => setCForm({ ...cForm, fuel_level: e.target.value })} className="bg-muted/50" /></div>
                </div>
                <Textarea value={cForm.notes} onChange={e => setCForm({ ...cForm, notes: e.target.value })} placeholder="Observaciones" className="bg-muted/50 text-sm" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setCForm(null)}>Cancelar</Button>
                  <Button size="sm" className="flex-1" onClick={saveChecklist} disabled={saving}>
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Guardar
                  </Button>
                </div>
              </div>
            )}
            {checklists.isLoading ? <Skeleton className="h-20" /> : (checklists.data ?? []).length ? (
              (checklists.data ?? []).map(c => {
                const items = (c.items ?? []) as any[];
                const okCount = items.filter(i => i.ok).length;
                return (
                  <div key={c.id} className="console-panel p-3 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold capitalize text-foreground">Checklist de {c.kind}</p>
                      <div className="flex items-center gap-1">
                        <span className="status-badge bg-muted text-muted-foreground">{okCount}/{items.length}</span>
                        {canWrite && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => remove('vehicle_checklists', c.id, 'vehicle-checklists')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      {dt(c.created_at)}
                      {c.emergencies?.folio && ` · ${c.emergencies.folio}`}
                      {c.odometer != null && ` · ${c.odometer.toLocaleString()} km`}
                      {c.fuel_level != null && ` · ${c.fuel_level}%`}
                    </p>
                    {items.filter(i => !i.ok).length > 0 && (
                      <p className="text-warning">Pendientes: {items.filter(i => !i.ok).map(i => i.name).join(', ')}</p>
                    )}
                    {c.notes && <p className="text-muted-foreground">{c.notes}</p>}
                  </div>
                );
              })
            ) : <Empty text="Sin checklists registrados" />}
          </TabsContent>

          {/* BITÁCORA + HISTORIAL */}
          <TabsContent value="bitacora" className="space-y-3 pt-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <NotebookPen className="h-3.5 w-3.5" /> Registro automático desde Operaciones (salidas y emergencias del móvil)
            </p>
            {logbook.isLoading ? <Skeleton className="h-24" /> : trips.length ? (
              trips.map((t: any) => {
                const km = t.odometer_start != null && t.odometer_end != null ? t.odometer_end - t.odometer_start : null;
                const key = t.emergencies?.emergency_keys;
                return (
                  <div key={t.id} className="console-panel p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {key && (
                        <span className="status-badge font-mono" style={{ backgroundColor: `${key.color}20`, color: key.color }}>
                          {key.code}
                        </span>
                      )}
                      <span className="font-mono text-foreground">{t.emergencies?.folio ?? '—'}</span>
                      <span className="text-muted-foreground">{key?.name}</span>
                      {!t.released_at && <span className="status-badge bg-emergency/20 text-emergency">En servicio</span>}
                    </div>
                    <p className="text-muted-foreground">{t.emergencies?.address}</p>
                    <p className="text-muted-foreground">
                      Salida {dt(t.assigned_at)} · Regreso {t.released_at ? dt(t.released_at) : '—'}
                    </p>
                    <p className="text-muted-foreground">
                      Km salida {t.odometer_start?.toLocaleString() ?? '—'} · Km regreso {t.odometer_end?.toLocaleString() ?? '—'}
                      {km != null && ` · Recorrido ${km.toLocaleString()} km`}
                    </p>
                    <p className="text-muted-foreground">
                      Conductor: <span className="text-foreground">{driverOf(t)?.name ?? '—'}</span> · 6-0: {t.volunteer_count ?? 0}
                    </p>
                    {crewOf(t).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {crewOf(t).map(p => (
                          <Badge key={p.id} variant="outline" className="text-[10px]">
                            {p.volunteers?.code ? `${p.volunteers.code} · ` : ''}{p.volunteers?.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : <Empty text="El móvil aún no registra salidas" />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value ?? '—'}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="console-panel p-3 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-4 text-center">{text}</p>;
}

function AlertLine({ level, text }: { level: 'ok' | 'warning' | 'danger'; text: string }) {
  const cls = level === 'danger' ? 'bg-emergency/15 text-emergency' : 'bg-warning/15 text-warning';
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${cls}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {text}
    </div>
  );
}
