import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface RadioKey {
  id: string;
  organization_id: string;
  category: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export function useRadioGlossary() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['radio-glossary', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('radio_glossary_keys')
        .select('*')
        .eq('organization_id', orgId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as RadioKey[];
    },
  });
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface FormState { id?: string; category: string; code: string; name: string; description: string; sort_order: string }

export default function RadioGlossary({ editable = false, compact = false }: { editable?: boolean; compact?: boolean }) {
  const { orgId } = useOrganization();
  const qc = useQueryClient();
  const { data, isLoading } = useRadioGlossary();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => Array.from(new Set((data ?? []).map(k => k.category))), [data]);

  const filtered = useMemo(() => {
    const t = norm(q.trim());
    return (data ?? []).filter(k =>
      (!cat || k.category === cat) &&
      (!t || norm(k.code).includes(t) || norm(k.name).includes(t) || norm(k.description ?? '').includes(t)),
    );
  }, [data, q, cat]);

  const grouped = useMemo(() => {
    const m = new Map<string, RadioKey[]>();
    filtered.forEach(k => { if (!m.has(k.category)) m.set(k.category, []); m.get(k.category)!.push(k); });
    return Array.from(m.entries());
  }, [filtered]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['radio-glossary'] });

  const save = async () => {
    if (!form || !orgId) return;
    if (!form.category.trim() || !form.code.trim() || !form.name.trim()) { toast.error('Categoría, código y significado son obligatorios'); return; }
    setSaving(true);
    const payload = {
      organization_id: orgId,
      category: form.category.trim(),
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      sort_order: parseInt(form.sort_order) || 0,
    };
    const { error } = form.id
      ? await supabase.from('radio_glossary_keys').update(payload).eq('id', form.id)
      : await supabase.from('radio_glossary_keys').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? 'Clave actualizada' : 'Clave agregada');
    setForm(null);
    refresh();
  };

  const remove = async (k: RadioKey) => {
    if (!confirm(`¿Eliminar la clave radial "${k.code} – ${k.name}"?`)) return;
    const { error } = await supabase.from('radio_glossary_keys').delete().eq('id', k.id);
    if (error) toast.error(error.message); else { toast.success('Clave eliminada'); refresh(); }
  };

  const nextOrder = ((data ?? []).reduce((m, k) => Math.max(m, k.sort_order), 0) + 10).toString();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus={compact} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por clave o palabra (ej. 6-8, grifo, aljibe)…" className="pl-8 bg-muted/50" />
        </div>
        {editable && (
          <Button size="sm" className="text-xs" onClick={() => setForm({ category: cat ?? categories[0] ?? '', code: '', name: '', description: '', sort_order: nextOrder })}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva clave radial
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCat(null)} className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${!cat ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>Todas</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${cat === c ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>{c}</button>
        ))}
      </div>

      <div className={compact ? 'max-h-[60vh] overflow-y-auto pr-1 space-y-4' : 'space-y-4'}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {(data ?? []).length === 0 ? 'Aún no hay claves radiales cargadas.' : 'Sin resultados para la búsqueda.'}
          </p>
        ) : grouped.map(([c, items]) => (
          <div key={c} className="console-panel overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</div>
            <ul>
              {items.map(k => (
                <li key={k.id} className="flex items-start gap-3 border-b border-border/50 px-3 py-2 last:border-0">
                  <span className="min-w-[4.5rem] font-mono text-sm font-bold text-emergency">{k.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{k.name}</p>
                    {k.description && <p className="text-xs text-muted-foreground">{k.description}</p>}
                  </div>
                  {editable && (
                    <div className="flex shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setForm({ id: k.id, category: k.category, code: k.code, name: k.name, description: k.description ?? '', sort_order: k.sort_order.toString() })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(k)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar clave radial' : 'Nueva clave radial'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Categoría *</Label>
                <Input list="radio-cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-muted/50" />
                <datalist id="radio-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Clave *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="6-8" className="bg-muted/50 font-mono" /></div>
                <div className="col-span-2"><Label className="text-xs">Orden</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="bg-muted/50" /></div>
              </div>
              <div><Label className="text-xs">Significado *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted/50" /></div>
              <div><Label className="text-xs">Nota (opcional)</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-muted/50" /></div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
                <Button className="flex-1" onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
