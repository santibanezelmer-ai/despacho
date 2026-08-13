import { useVolunteers } from '@/hooks/useVolunteers';
import { Users, Search, Plus, Pencil, Trash2, Mail, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VolunteerFormDialog from '@/components/volunteers/VolunteerFormDialog';

export default function Volunteers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: volunteers, isLoading } = useVolunteers();
  const { canWrite } = useAuth();
  const { orgId, isOrgAdmin, scopedCompanyId, isCompanyAdmin } = useOrganization();
  const qc = useQueryClient();

  const scoped = (volunteers ?? []).filter((v: any) =>
    scopedCompanyId ? v.company_id === scopedCompanyId : true
  );
  const filtered = scoped.filter((v: any) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.companies?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.ranks?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (v: any) => {
    if (!confirm(`¿Eliminar a "${v.name}"?`)) return;
    const { error } = await supabase.from('volunteers').delete().eq('id', v.id);
    if (error) toast.error(error.message);
    else { toast.success('Voluntario eliminado'); qc.invalidateQueries({ queryKey: ['volunteers'] }); }
  };

  const inviteToPwa = async (v: any) => {
    if (!orgId) return;
    if (!v.email) { toast.error('Este voluntario no tiene email registrado'); return; }
    setBusyId(v.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inv, error } = await (supabase as any)
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email: v.email.toLowerCase(),
        role: 'voluntario',
        invited_by: user?.id,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); setBusyId(null); return; }

    await (supabase as any).from('volunteers').update({ invitation_sent_at: new Date().toISOString() }).eq('id', v.id);

    const url = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* portapapeles no disponible */
    }
    toast.success('Invitación creada. Link copiado al portapapeles.');
    qc.invalidateQueries({ queryKey: ['volunteers'] });
    setBusyId(null);
  };

  const togglePwa = async (v: any) => {
    setBusyId(v.id);
    const { error } = await (supabase as any).from('volunteers').update({ pwa_enabled: !v.pwa_enabled }).eq('id', v.id);
    if (error) toast.error(error.message);
    else { toast.success(v.pwa_enabled ? 'Acceso a la PWA deshabilitado' : 'Acceso a la PWA habilitado'); qc.invalidateQueries({ queryKey: ['volunteers'] }); }
    setBusyId(null);
  };

  const pwaBadge = (v: any) => {
    if (v.user_id) {
      return v.pwa_enabled
        ? <span className="status-badge bg-success/20 text-success">PWA activa</span>
        : <span className="status-badge bg-destructive/20 text-destructive">PWA bloqueada</span>;
    }
    if (v.invitation_sent_at) return <span className="status-badge bg-amber-500/20 text-amber-400">Invitado</span>;
    return <span className="status-badge bg-muted text-muted-foreground">Sin cuenta</span>;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-warning" /> Voluntarios
        </h1>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditingVolunteer(null); setDialogOpen(true); }} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Voluntario
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, compañía, rango..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Compañía</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Acceso PWA</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              filtered.map((v: any) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{v.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.companies?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${v.status === 'activo' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{pwaBadge(v)}</td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isOrgAdmin && !v.user_id && (
                          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={busyId === v.id || !v.email}
                            onClick={() => inviteToPwa(v)} title={v.email ? 'Invitar a la PWA' : 'Falta email'}>
                            {busyId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {isOrgAdmin && v.user_id && (
                          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={busyId === v.id}
                            onClick={() => togglePwa(v)} title={v.pwa_enabled ? 'Bloquear acceso PWA' : 'Habilitar acceso PWA'}>
                            {v.pwa_enabled ? <ShieldOff className="h-3.5 w-3.5 text-destructive" /> : <Shield className="h-3.5 w-3.5 text-success" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingVolunteer(v); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VolunteerFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} volunteer={editingVolunteer} />
    </div>
  );
}
