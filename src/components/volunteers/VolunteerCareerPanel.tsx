import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, Medal, Briefcase, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { anbProgress, serviceTime, MALLA_LABEL } from '@/lib/volunteerCareer';

interface Props {
  volunteer: any;
  training: any[];
  positions: any[];
  canWrite: boolean;
}

const d = (v?: string | null) => (v ? new Date(v + (v.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-CL') : '—');

export default function VolunteerCareerPanel({ volunteer, training, positions, canWrite }: Props) {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const st = serviceTime(volunteer.join_date);
  const anb = anbProgress(training);
  const [registry, setRegistry] = useState<string>(volunteer.anb_registry ?? '');
  const [savingReg, setSavingReg] = useState(false);
  const [form, setForm] = useState({ position: '', company_name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const saveRegistry = async () => {
    setSavingReg(true);
    const { error } = await supabase.from('volunteers').update({ anb_registry: registry.trim() || null } as any).eq('id', volunteer.id);
    setSavingReg(false);
    if (error) return toast.error(error.message);
    toast.success('N° de Registro ANB guardado');
    qc.invalidateQueries({ queryKey: ['volunteers'] });
  };

  const addPosition = async () => {
    if (!form.position.trim()) return toast.error('Indica el cargo');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('volunteer_positions').insert({
      organization_id: orgId!, volunteer_id: volunteer.id,
      position: form.position.trim(), company_name: form.company_name.trim() || null,
      start_date: form.start_date || null, end_date: form.end_date || null, created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm({ position: '', company_name: '', start_date: '', end_date: '' });
    qc.invalidateQueries({ queryKey: ['volunteer-positions', volunteer.id] });
  };

  const delPosition = async (id: string) => {
    if (!confirm('¿Eliminar este cargo del historial?')) return;
    const { error } = await (supabase as any).from('volunteer_positions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['volunteer-positions', volunteer.id] });
  };

  return (
    <div className="space-y-4">
      {/* Años de servicio */}
      <section className="console-panel p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Medal className="h-3.5 w-3.5 text-warning" /> Años de servicio
        </p>
        {st ? (
          <>
            <p className="text-lg font-bold text-foreground">{st.label}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{st.honor}</Badge>
              <span className="text-muted-foreground">
                Próximo premio de constancia: <b className="text-foreground">{st.nextQuinquennium} años</b> el {st.nextDate.toLocaleDateString('es-CL')} ({st.daysToNext} días)
              </span>
            </div>
          </>
        ) : <p className="text-xs text-muted-foreground">Registra la fecha de ingreso para calcular la antigüedad.</p>}
      </section>

      {/* Nivel ANB */}
      <section className="console-panel p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-warning" /> Formación ANB
          </p>
          <Badge className="bg-primary/20 text-primary">Nivel: {anb.level}</Badge>
        </div>
        {anb.progress.map(p => (
          <div key={p.malla} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{MALLA_LABEL[p.malla]}</span>
              <span className="font-mono text-muted-foreground">{p.done}/{p.total}</span>
            </div>
            <Progress value={p.pct} className="h-2" />
          </div>
        ))}
        <div className="text-xs">
          <span className="text-muted-foreground">Especialidades: </span>
          {anb.specialties.length ? anb.specialties.join(', ') : '—'}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">N° de Registro ANB</Label>
            <Input value={registry} disabled={!canWrite} maxLength={40} className="bg-muted/50 h-8"
              onChange={e => setRegistry(e.target.value)} />
          </div>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={saveRegistry} disabled={savingReg}>
              {savingReg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Los cursos se registran en Capacitaciones eligiendo el curso del catálogo ANB.</p>
      </section>

      {/* Cargos */}
      <section className="console-panel p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-warning" /> Historial de cargos
        </p>
        {positions.length ? positions.map(p => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5">
            <div>
              <p className="font-medium">{p.position}{p.company_name ? ` · ${p.company_name}` : ''}</p>
              <p className="text-xs text-muted-foreground">{d(p.start_date)} – {p.end_date ? d(p.end_date) : 'a la fecha'}</p>
            </div>
            {canWrite && (
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => delPosition(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )) : <p className="text-xs text-muted-foreground">Sin cargos registrados.</p>}
        {canWrite && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Input placeholder="Cargo (ej. Teniente 1°)" value={form.position} className="bg-muted/50 h-8"
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            <Input placeholder="Compañía" value={form.company_name} className="bg-muted/50 h-8"
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            <Input type="date" value={form.start_date} className="bg-muted/50 h-8" aria-label="Desde"
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input type="date" value={form.end_date} className="bg-muted/50 h-8" aria-label="Hasta"
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            <Button size="sm" variant="outline" className="col-span-2 text-xs" onClick={addPosition} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}Agregar cargo
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
