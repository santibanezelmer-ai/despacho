import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { FileDown, Download, Loader2, Users, Truck, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const { orgId } = useOrganization();
  const [loading, setLoading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [emergencyStatus, setEmergencyStatus] = useState('all');

  const exportVolunteers = async () => {
    setLoading('volunteers');
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*, companies(name), ranks(name)')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      const headers = ['Nombre', 'RUT', 'Email', 'Teléfono', 'Compañía', 'Grado', 'Estado', 'Disponible', 'Especialidades'];
      const rows = (data ?? []).map((v: any) => [
        v.name, v.rut ?? '', v.email ?? '', v.phone ?? '',
        v.companies?.name ?? '', v.ranks?.name ?? '',
        v.status, v.available ? 'Sí' : 'No',
        (v.specialties ?? []).join('; '),
      ]);
      downloadCSV(`voluntarios_${format(new Date(), 'yyyyMMdd')}.csv`, headers, rows);
      toast.success(`${rows.length} voluntarios exportados`);
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  const exportVehicles = async () => {
    setLoading('vehicles');
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, companies(name)')
        .eq('organization_id', orgId!)
        .order('code');
      if (error) throw error;
      const headers = ['Código', 'Tipo', 'Patente', 'Compañía', 'Capacidad', 'Año', 'Estado'];
      const rows = (data ?? []).map((v: any) => [
        v.code, v.type, v.plate ?? '', v.companies?.name ?? '',
        String(v.capacity), v.year ? String(v.year) : '', v.status,
      ]);
      downloadCSV(`moviles_${format(new Date(), 'yyyyMMdd')}.csv`, headers, rows);
      toast.success(`${rows.length} móviles exportados`);
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  const exportEmergencies = async () => {
    setLoading('emergencies');
    try {
      let q = supabase
        .from('emergencies')
        .select('*, emergency_keys(code, name)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (emergencyStatus !== 'all') q = q.eq('status', emergencyStatus);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await q;
      if (error) throw error;
      const headers = ['Folio', 'Clave', 'Dirección', 'Estado', 'Informante', 'Teléfono', 'Fecha Despacho', 'Fecha Finalización', 'Observaciones'];
      const rows = (data ?? []).map((e: any) => [
        e.folio, `${e.emergency_keys?.code ?? ''} - ${e.emergency_keys?.name ?? ''}`,
        e.address, e.status, e.caller_name ?? '', e.caller_phone ?? '',
        e.dispatched_at ? format(new Date(e.dispatched_at), 'dd/MM/yyyy HH:mm') : '',
        e.finished_at ? format(new Date(e.finished_at), 'dd/MM/yyyy HH:mm') : '',
        e.observations ?? '',
      ]);
      downloadCSV(`emergencias_${format(new Date(), 'yyyyMMdd')}.csv`, headers, rows);
      toast.success(`${rows.length} emergencias exportadas`);
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
        <FileDown className="h-5 w-5 text-info" /> Exportaciones
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-info" /> Voluntarios</CardTitle>
            <CardDescription className="text-xs">Exportar listado completo con grados y compañías.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full gap-2" onClick={exportVolunteers} disabled={loading === 'volunteers'}>
              {loading === 'volunteers' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4 text-info" /> Móviles</CardTitle>
            <CardDescription className="text-xs">Exportar inventario de vehículos con estado y compañía.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full gap-2" onClick={exportVehicles} disabled={loading === 'vehicles'}>
              {loading === 'vehicles' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Siren className="h-4 w-4 text-emergency" /> Emergencias</CardTitle>
            <CardDescription className="text-xs">Exportar registro con filtros de fecha y estado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Desde</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Hasta</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Select value={emergencyStatus} onValueChange={setEmergencyStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="despacho">Despacho</SelectItem>
                <SelectItem value="en_ruta">En ruta</SelectItem>
                <SelectItem value="en_trabajo">En trabajo</SelectItem>
                <SelectItem value="controlada">Controlada</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full gap-2" onClick={exportEmergencies} disabled={loading === 'emergencies'}>
              {loading === 'emergencies' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
