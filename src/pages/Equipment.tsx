import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVehicles } from '@/hooks/useVehicles';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Wrench, Plus, Pencil, Trash2, Search, Package, Download, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import EquipmentFormDialog from '@/components/equipment/EquipmentFormDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const conditionConfig: Record<string, { label: string; color: string }> = {
  bueno: { label: 'Bueno', color: 'hsl(145, 65%, 42%)' },
  regular: { label: 'Regular', color: 'hsl(35, 95%, 55%)' },
  malo: { label: 'Malo', color: 'hsl(0, 85%, 55%)' },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'hsl(0, 0%, 50%)' },
};

const CONDITIONS = ['bueno', 'regular', 'malo', 'fuera_servicio'] as const;

function useEquipment(vehicleId?: string) {
  return useQuery({
    queryKey: ['equipment', vehicleId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*, vehicles(id, code, type, company_id)').order('name');
      if (vehicleId) q = q.eq('vehicle_id', vehicleId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function Equipment() {
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { data: vehicles } = useVehicles();
  const { data: companies } = useCompanies();
  const { data: equipment, isLoading } = useEquipment(vehicleFilter !== 'all' ? vehicleFilter : undefined);
  const { canWrite } = useAuth();
  const { scopedCompanyId, currentOrg } = useOrganization();
  const qc = useQueryClient();

  // If company-scoped, force the filter to that company and hide the picker.
  const effectiveCompanyFilter = scopedCompanyId ?? companyFilter;

  const scopedVehicles = useMemo(
    () => (vehicles ?? []).filter((v: any) => (scopedCompanyId ? v.company_id === scopedCompanyId : true)),
    [vehicles, scopedCompanyId]
  );

  const filtered = useMemo(() => {
    return (equipment ?? []).filter((e: any) => {
      const vCompanyId = e.vehicles?.company_id ?? null;
      if (scopedCompanyId && vCompanyId !== scopedCompanyId) return false;
      if (effectiveCompanyFilter !== 'all' && vCompanyId !== effectiveCompanyFilter) return false;
      if (conditionFilter !== 'all' && (e.condition ?? 'bueno') !== conditionFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [equipment, scopedCompanyId, effectiveCompanyFilter, conditionFilter, search]);

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const { error } = await supabase.from('equipment').delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else { toast.success('Equipamiento eliminado'); qc.invalidateQueries({ queryKey: ['equipment'] }); }
  };

  const companyName = (cid: string | null) =>
    (companies ?? []).find((c: any) => c.id === cid)?.name ?? '—';

  const exportCsv = () => {
    if (!filtered.length) { toast.error('No hay datos para exportar'); return; }
    const headers = ['Nombre', 'Móvil', 'Tipo Móvil', 'Compañía', 'Cantidad', 'Condición', 'Última Revisión', 'Notas'];
    const rows = filtered.map((e: any) => [
      e.name,
      e.vehicles?.code ?? '—',
      e.vehicles?.type ?? '—',
      companyName(e.vehicles?.company_id),
      e.quantity,
      conditionConfig[e.condition ?? 'bueno']?.label ?? e.condition ?? '—',
      e.last_check ? new Date(e.last_check).toLocaleDateString('es-CL') : '—',
      e.notes ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  const exportPdf = () => {
    if (!filtered.length) { toast.error('No hay datos para exportar'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = 'Inventario de Móviles';
    const subtitle = currentOrg?.organization?.name
      ? `${currentOrg.organization.name}${scopedCompanyId ? ` — ${companyName(scopedCompanyId)}` : ''}`
      : '';
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 20);
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')} · ${filtered.length} registros`, 14, 26);
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Móvil', 'Compañía', 'Cant.', 'Condición', 'Última Revisión', 'Notas']],
      body: filtered.map((e: any) => [
        e.name,
        e.vehicles?.code ?? '—',
        companyName(e.vehicles?.company_id),
        e.quantity,
        conditionConfig[e.condition ?? 'bueno']?.label ?? '—',
        e.last_check ? new Date(e.last_check).toLocaleDateString('es-CL') : '—',
        e.notes ?? '',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    doc.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF descargado');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5 text-warning" /> Equipamiento
          {scopedCompanyId && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              · {companyName(scopedCompanyId)}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} className="text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} className="text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          {canWrite && (
            <Button size="sm" onClick={() => { setEditingItem(null); setDialogOpen(true); }} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Equipo
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar equipo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
        </div>
        {!scopedCompanyId && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-48 bg-muted/50">
              <SelectValue placeholder="Todas las compañías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las compañías</SelectItem>
              {(companies ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-48 bg-muted/50">
            <SelectValue placeholder="Todos los móviles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los móviles</SelectItem>
            {scopedVehicles.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.code} - {v.type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-40 bg-muted/50">
            <SelectValue placeholder="Condición" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las condiciones</SelectItem>
            {CONDITIONS.map(c => (
              <SelectItem key={c} value={c}>{conditionConfig[c].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((item: any) => {
            const cond = conditionConfig[item.condition ?? 'bueno'] ?? conditionConfig.bueno;
            return (
              <div key={item.id} className="console-panel p-4 hover:border-foreground/20 transition-colors group relative">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-foreground text-sm">{item.name}</span>
                  <span className="status-badge text-[10px]" style={{ backgroundColor: `${cond.color}20`, color: cond.color }}>
                    {cond.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {item.vehicles?.code ?? '—'} · Cant: {item.quantity}
                </p>
                {item.notes && <p className="mt-1 text-xs text-muted-foreground truncate">{item.notes}</p>}
                {canWrite && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => { setEditingItem(item); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="console-panel flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay equipamiento registrado</p>
        </div>
      )}

      <EquipmentFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} equipment={editingItem} />
    </div>
  );
}
