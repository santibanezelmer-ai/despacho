import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Trash2, Users } from 'lucide-react';
import SystemSoundsAdmin from '@/components/admin/SystemSoundsAdmin';
import RanksAdmin from '@/components/admin/RanksAdmin';
import DemoSettingsAdmin from '@/components/admin/DemoSettingsAdmin';
import InvitationsAdmin from '@/components/admin/InvitationsAdmin';
import OrganizationBrandingCard from '@/components/admin/OrganizationBrandingCard';

type OrgRole = 'admin' | 'operador' | 'oficial' | 'visor';

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Visor',
};

const ROLE_COLORS: Record<OrgRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  operador: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  oficial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  visor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const ALL_ROLES: OrgRole[] = ['admin', 'operador', 'oficial', 'visor'];

export default function AdminPanel() {
  const { user } = useAuth();
  const { orgId, isOrgAdmin, currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch members of the CURRENT organization only
  const { data: members, isLoading } = useQuery({
    queryKey: ['org-members', orgId],
    enabled: isOrgAdmin && !!orgId,
    queryFn: async () => {
      const { data: memberRows, error: mErr } = await (supabase as any)
        .from('organization_members')
        .select('id, user_id, role, status, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (mErr) throw mErr;
      if (!memberRows?.length) return [];

      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return memberRows.map((m: any) => ({
        ...m,
        profile: map.get(m.user_id) ?? null,
      }));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: OrgRole }) => {
      const { error } = await (supabase as any)
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('Rol actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('Miembro removido de la organización');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No tienes permisos de administrador en esta organización.</p>
      </div>
    );
  }

  const totalUsers = members?.length ?? 0;
  const adminCount = members?.filter((m: any) => m.role === 'admin').length ?? 0;
  const activeCount = members?.filter((m: any) => m.status === 'active').length ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-border/60 p-6"
        style={{ background: 'var(--gradient-panel)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: 'var(--gradient-emergency)' }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
              style={{ background: 'var(--gradient-emergency)' }}
            >
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Miembros de {currentOrg?.organization?.name ?? 'la organización'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestiona los roles y accesos dentro de esta organización
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="stat-tile min-w-[110px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{totalUsers}</p>
            </div>
            <div className="stat-tile min-w-[110px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-success mt-0.5">{activeCount}</p>
            </div>
            <div className="stat-tile min-w-[110px] hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-emergency mt-0.5">{adminCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="console-panel-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Usuario</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Rol</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Cargando miembros...
                </TableCell>
              </TableRow>
            ) : !members?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Aún no hay miembros. Invita usuarios desde la sección inferior.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m: any) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <TableRow key={m.id} className="border-border/30">
                    <TableCell className="text-sm font-medium">
                      {m.profile?.display_name || '—'}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.profile?.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) => {
                          if (isSelf && m.role === 'admin' && v !== 'admin') {
                            toast.error('No puedes quitarte el rol de admin a ti mismo');
                            return;
                          }
                          updateRoleMutation.mutate({ memberId: m.id, role: v as OrgRole });
                        }}
                      >
                        <SelectTrigger className={`h-7 w-36 text-xs ${ROLE_COLORS[m.role as OrgRole]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map(r => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`¿Remover a ${m.profile?.display_name || m.profile?.email} de esta organización?`)) {
                              removeMemberMutation.mutate(m.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        <Shield className="inline h-3 w-3 mr-1" />
        Los cambios de rol se aplican inmediatamente. Remover a un miembro solo afecta a esta organización.
      </p>

      <div className="border-t border-border pt-6">
        <OrganizationBrandingCard />
      </div>

      <div className="border-t border-border pt-6">
        <InvitationsAdmin />
      </div>

      <div className="border-t border-border pt-6">
        <RanksAdmin />
      </div>

      <div className="border-t border-border pt-6">
        <SystemSoundsAdmin />
      </div>

      <div className="border-t border-border pt-6">
        <DemoSettingsAdmin />
      </div>
    </div>
  );
}
