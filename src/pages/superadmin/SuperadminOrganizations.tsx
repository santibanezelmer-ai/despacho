import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Search, CheckCircle, XCircle, Pause, Play, Plus, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'text-success' },
  pending: { label: 'Pendiente', color: 'text-warning' },
  suspended: { label: 'Suspendida', color: 'text-destructive' },
  rejected: { label: 'Rechazada', color: 'text-muted-foreground' },
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Visor',
};

const memberStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  invited: { label: 'Invitado', variant: 'secondary' },
  suspended: { label: 'Suspendido', variant: 'destructive' },
};

const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío',
  'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function MembersRow({ orgId }: { orgId: string }) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['superadmin-org-members', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organization_members')
        .select('id, user_id, role, status, profiles!organization_members_user_id_fkey(display_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (error) {
        // Fallback: query without join then fetch profiles separately
        const { data: membersOnly, error: e2 } = await (supabase as any)
          .from('organization_members')
          .select('id, user_id, role, status')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true });
        if (e2) throw e2;
        if (!membersOnly?.length) return [];
        const userIds = membersOnly.map((m: any) => m.user_id);
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);
        const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        return membersOnly.map((m: any) => ({
          ...m,
          profile: profileMap.get(m.user_id) ?? null,
        }));
      }
      return (data ?? []).map((m: any) => ({
        ...m,
        profile: m.profiles ?? null,
      }));
    },
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="px-8 py-3 bg-muted/20">
          <Skeleton className="h-4 w-48" />
        </td>
      </tr>
    );
  }

  if (!members?.length) {
    return (
      <tr>
        <td colSpan={6} className="px-8 py-3 bg-muted/20 text-xs text-muted-foreground italic">
          Sin miembros asignados
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="bg-muted/20 border-b border-border/50 px-8 py-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Miembros ({members.length})
          </div>
          <div className="grid gap-1.5">
            {members.map((m: any) => {
              const ms = memberStatusLabels[m.status] ?? memberStatusLabels.active;
              return (
                <div key={m.id} className="flex items-center gap-3 text-xs py-1 px-2 rounded bg-background/50">
                  <span className="font-medium text-foreground min-w-[140px]">
                    {m.profile?.display_name ?? 'Sin nombre'}
                  </span>
                  <span className="text-muted-foreground min-w-[180px]">
                    {m.profile?.email ?? '—'}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {roleLabels[m.role] ?? m.role}
                  </Badge>
                  <Badge variant={ms.variant} className="text-[10px] px-1.5 py-0">
                    {ms.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function SuperadminOrganizations() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', commune: '', region: '', status: 'active', adminEmail: '' });
  const qc = useQueryClient();

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['superadmin-orgs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from('organizations').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['superadmin-orgs'] }); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setCreating(true);
    const slug = slugify(form.name);

    const { data: orgData, error: orgError } = await (supabase as any).from('organizations').insert({
      name: form.name.trim(),
      slug,
      commune: form.commune.trim() || null,
      region: form.region || null,
      status: form.status,
    }).select('id').single();

    if (orgError) { toast.error(orgError.message); setCreating(false); return; }

    const adminEmail = form.adminEmail.trim().toLowerCase();
    if (adminEmail && orgData?.id) {
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('user_id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (profileError) {
        toast.warning('Organización creada, pero hubo un error buscando el usuario: ' + profileError.message);
      } else if (!profile) {
        toast.warning('Organización creada, pero el correo no corresponde a un usuario registrado.');
      } else {
        const { error: memberError } = await (supabase as any)
          .from('organization_members')
          .insert({
            organization_id: orgData.id,
            user_id: profile.user_id,
            role: 'admin',
            status: 'active',
          });

        if (memberError) {
          toast.warning('Organización creada, pero no se pudo asignar el admin: ' + memberError.message);
        } else {
          toast.success('Organización creada con administrador asignado');
        }
      }
    } else {
      toast.success('Organización creada');
    }

    setForm({ name: '', commune: '', region: '', status: 'active', adminEmail: '' });
    setOpen(false);
    setCreating(false);
    qc.invalidateQueries({ queryKey: ['superadmin-orgs'] });
  };

  const filtered = (orgs ?? []).filter((o: any) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.commune ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (o.region ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-info" /> Organizaciones
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nueva Organización
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Organización</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cuerpo de Bomberos de..." />
              </div>
              <div className="space-y-2">
                <Label>Comuna</Label>
                <Input value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} placeholder="Ej: Santiago" />
              </div>
              <div className="space-y-2">
                <Label>Región</Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar región" /></SelectTrigger>
                  <SelectContent>
                    {REGIONES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado inicial</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email del Administrador</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="admin@ejemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. El usuario debe estar registrado en la plataforma.
                </p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creando...' : 'Crear Organización'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium w-8"></th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Comuna</th>
              <th className="px-4 py-3 text-left font-medium">Región</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              filtered.flatMap((o: any) => {
                const st = statusConfig[o.status] ?? statusConfig.pending;
                const isExpanded = expandedOrg === o.id;
                const rows = [
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedOrg(isExpanded ? null : o.id)}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.commune ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.region ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                      {o.status !== 'active' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={() => updateStatus(o.id, 'active')} title="Activar">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'active' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-warning" onClick={() => updateStatus(o.id, 'suspended')} title="Suspender">
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'suspended' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={() => updateStatus(o.id, 'active')} title="Reactivar">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => updateStatus(o.id, 'rejected')} title="Rechazar">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>,
                ];
                if (isExpanded) {
                  rows.push(<MembersRow key={`members-${o.id}`} orgId={o.id} />);
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
