import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, CheckCircle2, ListChecks, Plus, Trash2, AlertTriangle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { dutyCompanyScope, visibleDutyCompanies, type DutyCompany } from '@/lib/companyDuty';

const pending = 'Pendiente de instalar y validar Guardias. No se guardarán cambios.';

export default function CompanyDuty({ personal = false }: { personal?: boolean }) {
  const { orgId, orgRole, currentOrg } = useOrganization();
  const scope = personal ? 'own' : dutyCompanyScope(orgRole, currentOrg?.company_id ?? null);
  const [company, setCompany] = useState('all');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState([{ id: 0 }]);
  const companies = useQuery({
    queryKey: ['duty-companies', orgId, orgRole, currentOrg?.company_id, scope],
    enabled: !!orgId && scope !== 'own',
    retry: false,
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase.from('companies').select('id,name,number,organization_id').eq('organization_id', orgId).order('number');
      if (scope === 'company') {
        if (!currentOrg?.company_id) return [];
        query = query.eq('id', currentOrg.company_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return visibleDutyCompanies((data ?? []) as DutyCompany[], orgId, orgRole, currentOrg?.company_id ?? null);
    },
  });
  const options = companies.data ?? [];
  const activeCompany = options.some(c => c.id === company) ? company : 'all';
  const resetFilters = () => { setCompany('all'); setDate(''); setStatus('all'); };

  return <section className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5 text-info" />{personal ? 'Mis guardias' : 'Guardias por Compañía'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{currentOrg?.organization.name}</p></div>
      {scope !== 'own' && <Button variant="outline" size="sm" onClick={() => { setSlots([{ id: 0 }]); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Preparar turno</Button>}
    </header>
    <div role="status" className="flex items-start gap-3 border-l-2 border-warning bg-warning/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><div><p className="font-medium">Guardias pendiente de activación</p><p className="mt-1 text-muted-foreground">{pending}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />
      {scope === 'organization' ? 'Supervisión del Cuerpo · Gestión mediante delegación explícita' : scope === 'company' ? 'Ámbito de su compañía · Gestión mediante delegación explícita' : 'Consulta personal · Solo sus asignaciones'}
      <Badge variant="outline">Permisos de Guardias sin validar</Badge>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{ name: 'Hoy', icon: CalendarDays }, { name: 'Próximas', icon: Clock }, { name: 'En curso', icon: ListChecks }, { name: 'Finalizadas', icon: CheckCircle2 }].map(item => <div key={item.name} className="rounded-md border border-border bg-card p-4"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{item.name}<item.icon className="h-4 w-4 text-info" /></div><p className="mt-2 text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Sin datos disponibles</p></div>)}
    </div>
    <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5"><Label htmlFor="duty-company">Compañía</Label><Select value={activeCompany} onValueChange={setCompany} disabled={scope === 'own' || companies.isLoading || !!companies.error}><SelectTrigger id="duty-company"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{scope === 'own' ? 'Según sus asignaciones' : 'Todas las autorizadas'}</SelectItem>{options.map(c => <SelectItem key={c.id} value={c.id}>{c.number}ª · {c.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="duty-date">Fecha</Label><Input id="duty-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="duty-status">Estado</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="duty-status"><SelectValue /></SelectTrigger><SelectContent>{[['all','Todos'],['borrador','Borrador'],['publicado','Publicado'],['en_curso','En curso'],['finalizado','Finalizado'],['cancelado','Cancelado']].map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <Button variant="ghost" onClick={resetFilters}>Limpiar filtros</Button>
    </div>
    {companies.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>No se pudieron consultar las compañías autorizadas.</span><Button variant="outline" size="sm" onClick={() => companies.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></div>}
    <Tabs defaultValue="shifts"><TabsList className="h-auto flex-wrap"><TabsTrigger value="shifts">Turnos</TabsTrigger><TabsTrigger value="confirmations">Confirmaciones</TabsTrigger><TabsTrigger value="attendance">Asistencia</TabsTrigger></TabsList>
      <TabsContent value="shifts" className="space-y-3"><div className="overflow-x-auto rounded-md border border-border"><Table><TableHeader><TableRow>{['Fecha y horario','Compañía','Turno','Ocupados','Disponibles','Estado'].map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell colSpan={6} className="h-44 text-center"><CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No hay turnos disponibles para consultar</p><p className="mt-1 text-sm text-muted-foreground">Los registros se mostrarán cuando Guardias esté instalado y validado.</p></TableCell></TableRow></TableBody></Table></div>
      <div className="flex flex-wrap gap-2">{['Publicar turno','Cancelar turno','Asignar voluntarios'].map(label => <Button key={label} size="sm" variant="outline" disabled title={pending}>{label}</Button>)}</div></TabsContent>
      <TabsContent value="confirmations"><div className="space-y-3 border-t border-border py-8 text-center"><Users className="mx-auto h-7 w-7 text-muted-foreground" /><p>No hay confirmaciones disponibles.</p><p className="text-sm text-muted-foreground">{pending}</p><Button disabled variant="outline" title={pending}>Confirmar mi guardia</Button></div></TabsContent>
      <TabsContent value="attendance"><div className="space-y-3 border-t border-border py-8 text-center"><ListChecks className="mx-auto h-7 w-7 text-muted-foreground" /><p>No hay asistencia disponible.</p><p className="text-sm text-muted-foreground">La validación requiere autorización específica de asistencia.</p><Button disabled variant="outline" title={pending}>Validar asistencia</Button></div></TabsContent>
    </Tabs>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Preparar turno en borrador</DialogTitle><DialogDescription>{pending}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <div className="space-y-1.5"><Label htmlFor="draft-company">Compañía</Label><Select defaultValue={activeCompany !== 'all' ? activeCompany : undefined}><SelectTrigger id="draft-company"><SelectValue placeholder="Seleccionar compañía autorizada" /></SelectTrigger><SelectContent>{options.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="draft-name">Nombre del turno</Label><Input id="draft-name" maxLength={160} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="draft-start">Inicio</Label><Input id="draft-start" type="datetime-local" /></div><div className="space-y-1.5"><Label htmlFor="draft-end">Término</Label><Input id="draft-end" type="datetime-local" /></div></div>
        <div className="space-y-1.5"><Label htmlFor="draft-mode">Modalidad</Label><Select defaultValue="presencial"><SelectTrigger id="draft-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="domiciliaria">Domiciliaria</SelectItem><SelectItem value="mixta">Mixta</SelectItem></SelectContent></Select></div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4"><h2 className="font-medium">Cupos</h2><Button type="button" size="sm" variant="outline" onClick={() => setSlots(prev => [...prev, { id: Math.max(...prev.map(s => s.id)) + 1 }])}><Plus className="mr-1 h-4 w-4" />Añadir cupo</Button></div>
        {slots.map((slot, index) => <fieldset key={slot.id} className="space-y-3 border-b border-border pb-4"><legend className="mb-2 text-sm text-muted-foreground">Cupo {index + 1}</legend><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`role-${slot.id}`}>Función</Label><Input id={`role-${slot.id}`} maxLength={100} /></div><div className="space-y-1.5"><Label htmlFor={`capacity-${slot.id}`}>Cantidad</Label><Input id={`capacity-${slot.id}`} type="number" min={1} max={500} defaultValue={1} /></div><div className="space-y-1.5"><Label htmlFor={`start-${slot.id}`}>Inicio del cupo</Label><Input id={`start-${slot.id}`} type="datetime-local" /></div><div className="space-y-1.5"><Label htmlFor={`end-${slot.id}`}>Término del cupo</Label><Input id={`end-${slot.id}`} type="datetime-local" /></div></div><Select defaultValue="presencial"><SelectTrigger aria-label={`Modalidad del cupo ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="domiciliaria">Domiciliaria</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" disabled={slots.length === 1} onClick={() => setSlots(prev => prev.filter(s => s.id !== slot.id))}><Trash2 className="mr-1 h-4 w-4" />Quitar cupo</Button></fieldset>)}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button><Button disabled title={pending}>Guardar borrador · Pendiente</Button></div>
      </form>
    </DialogContent></Dialog>
  </section>;
}