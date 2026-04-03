import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, ShieldPlus, Trash2, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import SystemSoundsAdmin from '@/components/admin/SystemSoundsAdmin';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Visor',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  operador: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  oficial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  visor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function AdminPanel() {
  const { hasRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  const isAdmin = hasRole('admin');

  // Fetch all profiles with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('*');
      if (rErr) throw rErr;

      return (profiles ?? []).map(p => ({
        ...p,
        roles: (roles ?? []).filter(r => r.user_id === p.user_id).map(r => r.role),
      }));
    },
    enabled: isAdmin,
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rol asignado correctamente');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rol eliminado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete roles first, then profile (auth user remains but without access)
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('user_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuario eliminado del sistema');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No tienes permisos de administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-emergency" />
        <h1 className="text-lg font-bold text-foreground">Gestión de Usuarios y Roles</h1>
      </div>

      <div className="console-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Usuario</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Roles</TableHead>
              <TableHead className="text-xs">Asignar Rol</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Cargando usuarios...
                </TableCell>
              </TableRow>
            ) : (
              users?.map(u => {
                const availableRoles = (['admin', 'operador', 'oficial', 'visor'] as AppRole[]).filter(
                  r => !u.roles.includes(r)
                );
                const isSelf = u.user_id === user?.id;

                return (
                  <TableRow key={u.id} className="border-border/30">
                    <TableCell className="text-sm font-medium">
                      {u.display_name || '—'}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin roles</span>
                        ) : (
                          u.roles.map(role => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={`text-[10px] cursor-pointer hover:opacity-70 ${ROLE_COLORS[role]}`}
                              onClick={() => {
                                if (isSelf && role === 'admin') {
                                  toast.error('No puedes quitarte el rol de admin a ti mismo');
                                  return;
                                }
                                removeRoleMutation.mutate({ userId: u.user_id, role });
                              }}
                            >
                              {ROLE_LABELS[role]} ×
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {availableRoles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedRole[u.user_id] || ''}
                            onValueChange={v => setSelectedRole(prev => ({ ...prev, [u.user_id]: v as AppRole }))}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs bg-muted/50">
                              <SelectValue placeholder="Rol..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map(r => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={!selectedRole[u.user_id]}
                            onClick={() => {
                              if (selectedRole[u.user_id]) {
                                addRoleMutation.mutate({ userId: u.user_id, role: selectedRole[u.user_id] });
                                setSelectedRole(prev => {
                                  const next = { ...prev };
                                  delete next[u.user_id];
                                  return next;
                                });
                              }
                            }}
                          >
                            <ShieldPlus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${u.display_name || u.email} del sistema?`)) {
                              deleteUserMutation.mutate(u.user_id);
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
        Haz clic en un rol para quitarlo. Los cambios se aplican inmediatamente.
      </p>

      <div className="border-t border-border pt-6">
        <SystemSoundsAdmin />
      </div>
    </div>
  );
}
