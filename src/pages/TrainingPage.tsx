import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useVolunteers } from '@/hooks/useVolunteers';
import { GraduationCap, Plus, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isPast, isBefore, addMonths } from 'date-fns';

interface TrainingRecord {
  id: string;
  volunteer_id: string;
  course_name: string;
  certification: string | null;
  date_completed: string | null;
  expiry_date: string | null;
  notes: string | null;
  organization_id: string;
  volunteers?: { name: string } | null;
}

function useTraining() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['training', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training')
        .select('*, volunteers(name)')
        .eq('organization_id', orgId!)
        .order('date_completed', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingRecord[];
    },
    enabled: !!orgId,
  });
}

function getExpiryStatus(expiry: string | null): 'ok' | 'warning' | 'expired' | 'none' {
  if (!expiry) return 'none';
  const d = new Date(expiry);
  if (isPast(d)) return 'expired';
  if (isBefore(d, addMonths(new Date(), 2))) return 'warning';
  return 'ok';
}

const EXPIRY_BADGE: Record<string, { label: string; className: string }> = {
  ok: { label: 'Vigente', className: 'bg-success/20 text-success border-success/30' },
  warning: { label: 'Por vencer', className: 'bg-warning/20 text-warning border-warning/30' },
  expired: { label: 'Vencido', className: 'bg-emergency/20 text-emergency border-emergency/30' },
  none: { label: 'Sin fecha', className: 'bg-muted text-muted-foreground border-border' },
};

export default function TrainingPage() {
  const { orgId, canWrite } = useOrganization();
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useTraining();
  const { data: volunteers } = useVolunteers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingRecord | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    volunteer_id: '',
    course_name: '',
    certification: '',
    date_completed: '',
    expiry_date: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({ volunteer_id: '', course_name: '', certification: '', date_completed: '', expiry_date: '', notes: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (r: TrainingRecord) => {
    setEditing(r);
    setForm({
      volunteer_id: r.volunteer_id,
      course_name: r.course_name,
      certification: r.certification ?? '',
      date_completed: r.date_completed ?? '',
      expiry_date: r.expiry_date ?? '',
      notes: r.notes ?? '',
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: orgId!,
        volunteer_id: form.volunteer_id,
        course_name: form.course_name.trim(),
        certification: form.certification.trim() || null,
        date_completed: form.date_completed || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from('training').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('training').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      toast.success(editing ? 'Capacitación actualizada' : 'Capacitación registrada');
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      toast.success('Capacitación eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.course_name.toLowerCase().includes(q) ||
      r.volunteers?.name?.toLowerCase().includes(q) ||
      r.certification?.toLowerCase().includes(q)
    );
  }, [records, search]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-info" /> Capacitaciones
        </h1>
        {canWrite && (
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        )}
      </div>

      <Input placeholder="Buscar curso, voluntario o certificación..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="console-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Voluntario</TableHead>
              <TableHead className="text-xs">Curso</TableHead>
              <TableHead className="text-xs">Certificación</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Vencimiento</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              {canWrite && <TableHead className="text-xs text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Sin registros</TableCell></TableRow>
            ) : filtered.map(r => {
              const status = getExpiryStatus(r.expiry_date);
              const badge = EXPIRY_BADGE[status];
              return (
                <TableRow key={r.id} className="border-border/30">
                  <TableCell className="text-sm font-medium">{r.volunteers?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{r.course_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.certification ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.date_completed ? format(new Date(r.date_completed), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.expiry_date ? format(new Date(r.expiry_date), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                      {status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {badge.label}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { if (confirm('¿Eliminar esta capacitación?')) deleteMutation.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Capacitación' : 'Registrar Capacitación'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Voluntario *</Label>
              <Select value={form.volunteer_id} onValueChange={v => setForm(f => ({ ...f, volunteer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(volunteers ?? []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Curso *</Label>
              <Input value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Certificación</Label>
              <Input value={form.certification} onChange={e => setForm(f => ({ ...f, certification: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha completado</Label>
                <Input type="date" value={form.date_completed} onChange={e => setForm(f => ({ ...f, date_completed: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vencimiento</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.volunteer_id || !form.course_name.trim()}>
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
