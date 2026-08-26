import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTimeFormat } from '@/hooks/useTimeFormat';

interface NotificationLogRow {
  id: string;
  organization_id: string;
  emergency_id: string;
  user_id: string;
  device_token: string;
  status: string;
  error_message: string | null;
  opened_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { pattern } = useTimeFormat();
  const { orgId } = useOrganization();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['notification-log', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('notification_log')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as NotificationLogRow[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Fetch profiles for display names
  const userIds = [...new Set((logs ?? []).map(l => l.user_id))];
  const { data: profiles } = useQuery({
    queryKey: ['notif-profiles', userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await (supabase as any).rpc('get_member_profiles');
      return ((data ?? []) as { user_id: string; display_name: string | null }[])
        .filter((p) => userIds.includes(p.user_id));
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  const totalSent = (logs ?? []).filter(l => l.status === 'sent' || l.status === 'opened').length;
  const totalFailed = (logs ?? []).filter(l => l.status === 'failed').length;
  const totalOpened = (logs ?? []).filter(l => l.status === 'opened').length;

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-emergency" />
        <h1 className="text-lg font-bold text-foreground">Notificaciones Push</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="console-panel p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalSent + totalFailed}</p>
          <p className="text-xs text-muted-foreground">Enviadas</p>
        </div>
        <div className="console-panel p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
          <p className="text-xs text-muted-foreground">Fallidas</p>
        </div>
        <div className="console-panel p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalOpened}</p>
          <p className="text-xs text-muted-foreground">Abiertas</p>
        </div>
      </div>

      {/* Table */}
      <div className="console-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Usuario</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Abierta</TableHead>
              <TableHead className="text-xs">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (logs ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Sin notificaciones registradas
                </TableCell>
              </TableRow>
            ) : (
              (logs ?? []).map(log => {
                const profile = profileMap.get(log.user_id);
                return (
                  <TableRow key={log.id} className="border-border/30">
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), `dd/MM ${pattern()}`, { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {profile?.display_name || profile?.email || log.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      {log.status === 'sent' || log.status === 'opened' ? (
                        <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" /> Enviada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" /> Fallida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.opened_at ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <Eye className="h-3 w-3 mr-1" />
                          {format(new Date(log.opened_at), pattern(), { locale: es })}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.error_message || '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
