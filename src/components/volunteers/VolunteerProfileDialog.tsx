import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useVolunteerProfile, seniority } from '@/hooks/useVolunteerProfile';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { toast } from 'sonner';
import {
  User, GraduationCap, Wrench, Siren, ClipboardList, Loader2, Plus, Trash2,
} from 'lucide-react';

const RECORD_TYPES: Record<string, { label: string; className: string }> = {
  merito: { label: 'Mérito', className: 'bg-success/20 text-success' },
  demerito: { label: 'Demérito', className: 'bg-emergency/20 text-emergency' },
  observacion: { label: 'Observación', className: 'bg-muted text-muted-foreground' },
  licencia: { label: 'Licencia', className: 'bg-warning/20 text-warning' },
  sancion: { label: 'Sanción', className: 'bg-destructive/20 text-destructive' },
};

const CONDITION_LABEL: Record<string, string> = {
  bueno: 'Bueno', regular: 'Regular', malo: 'Malo', fuera_servicio: 'Fuera de servicio',
};

interface Props {
  open: boolean;
  onClose: () => void;
  volunteer: any | null;
}

export default function VolunteerProfileDialog({ open, onClose, volunteer }: Props) {
  const { orgId } = useOrganization();
  const { canWrite } = useAuth();
  const qc = useQueryClient();
  const { formatDateTime } = useTimeFormat();
  const { training, equipment, attendance, records } = useVolunteerProfile(open ? volunteer?.id : null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ record_date: '', record_type: 'observacion', title: '', description: '' });

  const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString('es-CL') : '—');

  const saveRecord = async () => {
    if (!form.title.trim()) { toast.error('El título es obligatorio'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('volunteer_records').insert({
      organization_id: orgId!,
      volunteer_id: volunteer.id,
      record_date: form.record_date || new Date().toISOString().slice(0, 10),
      record_type: form.record_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Registro agregado a la hoja de vida');
    setForm({ record_date: '', record_type: 'observacion', title: '', description: '' });
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ['volunteer-records', volunteer.id] });
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('¿Eliminar este registro de la hoja de vida?')) return;
    const { error } = await (supabase as any).from('volunteer_records').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Registro eliminado');
      qc.invalidateQueries({ queryKey: ['volunteer-records', volunteer.id] });
    }
  };

  if (!volunteer) return null;

  const att = attendance.data ?? [];
  const vehiclesUsed = Array.from(
    new Set(att.map((a: any) => a.emergency_vehicles?.vehicles?.code).filter(Boolean))
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <User className="h-4 w-4 text-warning" />
            {volunteer.code && (
              <span className="status-badge bg-primary/20 text-primary font-mono">{volunteer.code}</span>
            )}
            {volunteer.name}
            <span className="ml-auto">
              <VolunteerPdfDownload
                volunteer={volunteer}
                training={(training.data as any[]) ?? []}
                equipment={(equipment.data as any[]) ?? []}
                attendance={att}
                records={(records.data as any[]) ?? []}
              />
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="datos">
          <TabsList className="grid w-full grid-cols-5 text-[11px]">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="capacitaciones">Capacitaciones</TabsTrigger>
            <TabsTrigger value="equipamiento">Equipamiento</TabsTrigger>
            <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
            <TabsTrigger value="hoja">Hoja de vida</TabsTrigger>
          </TabsList>

          {/* DATOS + COMPAÑÍA Y CARGO + ESPECIALIDADES */}
          <TabsContent value="datos" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="RUT" value={volunteer.rut} />
              <Field label="Teléfono" value={volunteer.phone} />
              <Field label="Email" value={volunteer.email} />
              <Field label="Compañía" value={volunteer.companies?.name} />
              <Field label="Cargo / Jerarquía" value={volunteer.ranks?.name} />
              <Field label="Estado" value={volunteer.status} />
              <Field label="Fecha de ingreso" value={date(volunteer.join_date)} />
              <Field label="Antigüedad" value={seniority(volunteer.join_date) ?? '—'} />
              <Field label="Disponible" value={volunteer.available ? 'Sí' : 'No'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Especialidades</p>
              <div className="flex flex-wrap gap-1.5">
                {(volunteer.specialties ?? []).length
                  ? (volunteer.specialties as string[]).map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))
                  : <span className="text-xs text-muted-foreground">Sin especialidades registradas</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Emergencias asistidas" value={att.length} />
              <Stat label="Capacitaciones" value={(training.data ?? []).length} />
              <Stat label="Equipos a cargo" value={(equipment.data ?? []).length} />
            </div>
          </TabsContent>

          {/* CAPACITACIONES (módulo Capacitaciones) */}
          <TabsContent value="capacitaciones" className="pt-4">
            {training.isLoading ? <Skeleton className="h-24 w-full" /> : (training.data ?? []).length ? (
              <div className="space-y-2">
                {(training.data as any[]).map(t => (
                  <div key={t.id} className="console-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-warning" /> {t.course_name}
                      </p>
                      <span className="text-xs text-muted-foreground">{date(t.date_completed)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.certification ? `${t.certification} · ` : ''}Vence: {date(t.expiry_date)}
                    </p>
                  </div>
                ))}
              </div>
            ) : <Empty text="Sin capacitaciones registradas. Se registran en el módulo Capacitaciones." />}
          </TabsContent>

          {/* EQUIPAMIENTO A CARGO (módulo Equipamiento) */}
          <TabsContent value="equipamiento" className="pt-4">
            {equipment.isLoading ? <Skeleton className="h-24 w-full" /> : (equipment.data ?? []).length ? (
              <div className="space-y-2">
                {(equipment.data as any[]).map(e => (
                  <div key={e.id} className="console-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 text-warning" /> {e.name}
                      </p>
                      <span className="status-badge bg-muted text-muted-foreground">
                        {CONDITION_LABEL[e.condition ?? 'bueno'] ?? e.condition}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      ID: {e.id.slice(0, 8)} · Cant: {e.quantity}
                      {e.vehicles?.code ? ` · Móvil ${e.vehicles.code}` : ''} · Asignado: {date(e.assigned_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : <Empty text="Sin equipamiento a cargo. Se asigna desde el módulo Equipamiento." />}
          </TabsContent>

          {/* ASISTENCIA OPERACIONAL / PARTICIPACIÓN (Personal por Móvil) */}
          <TabsContent value="asistencia" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total emergencias asistidas" value={att.length} />
              <Stat label="Móviles utilizados" value={vehiclesUsed.length ? vehiclesUsed.join(', ') : '—'} />
            </div>
            {attendance.isLoading ? <Skeleton className="h-24 w-full" /> : att.length ? (
              <div className="space-y-2">
                {att.map((a: any) => (
                  <div key={a.id} className="console-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Siren className="h-3.5 w-3.5 text-emergency" />
                        {a.emergencies?.folio ?? '—'}
                        {a.emergencies?.emergency_keys?.code && (
                          <span className="status-badge bg-primary/20 text-primary font-mono">
                            {a.emergencies.emergency_keys.code}
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(a.assigned_at, { withYear: true })}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.emergencies?.address ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Móvil: {a.emergency_vehicles?.vehicles?.code ?? '—'} · Rol: {a.role ?? '—'} · Estado: {a.emergencies?.status ?? '—'}
                    </p>
                  </div>
                ))}
              </div>
            ) : <Empty text="Sin participación registrada. Se genera automáticamente al asignarlo a un móvil en una emergencia." />}
          </TabsContent>

          {/* HOJA DE VIDA */}
          <TabsContent value="hoja" className="space-y-3 pt-4">
            {canWrite && (
              showForm ? (
                <div className="console-panel p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <Input type="date" value={form.record_date} className="bg-muted/50"
                        onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={form.record_type} onValueChange={v => setForm(f => ({ ...f, record_type: v }))}>
                        <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(RECORD_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Título *</Label>
                    <Input value={form.title} className="bg-muted/50"
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Detalle</Label>
                    <Textarea value={form.description} className="bg-muted/50 h-20"
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
                    <Button size="sm" className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90" onClick={saveRecord} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowForm(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo registro
                </Button>
              )
            )}
            {records.isLoading ? <Skeleton className="h-24 w-full" /> : (records.data ?? []).length ? (
              <div className="space-y-2">
                {(records.data as any[]).map(r => {
                  const t = RECORD_TYPES[r.record_type] ?? RECORD_TYPES.observacion;
                  return (
                    <div key={r.id} className="console-panel p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.title}
                          <span className={`status-badge ${t.className}`}>{t.label}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{date(r.record_date)}</span>
                          {canWrite && (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive"
                              onClick={() => deleteRecord(r.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {r.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{r.description}</p>}
                    </div>
                  );
                })}
              </div>
            ) : <Empty text="Sin registros en la hoja de vida." />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="console-panel p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground font-mono">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{text}</p>;
}
