import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Shield, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-success/20 text-success border-success/30',
  UPDATE: 'bg-info/20 text-info border-info/30',
  DELETE: 'bg-emergency/20 text-emergency border-emergency/30',
};

export default function AuditPage() {
  const { orgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      // Fetch profiles separately (no FK from audit_log to profiles)
      const userIds = [...new Set((data ?? []).map((l: any) => l.user_id).filter(Boolean))];
      let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);
        (profiles ?? []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      return (data ?? []).map((l: any) => ({ ...l, profiles: profilesMap[l.user_id] ?? null }));
    },
    enabled: !!orgId,
  });

  const tables = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l: any) => l.table_name).filter(Boolean))].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l: any) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (tableFilter !== 'all' && l.table_name !== tableFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const userName = (l as any).profiles?.display_name ?? (l as any).profiles?.email ?? '';
        if (!userName.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q) && !(l.table_name ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, tableFilter]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Shield className="h-5 w-5 text-info" /> Auditoría
      </h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuario..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="INSERT">Crear</SelectItem>
            <SelectItem value="UPDATE">Actualizar</SelectItem>
            <SelectItem value="DELETE">Eliminar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tablas</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="console-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Usuario</TableHead>
              <TableHead className="text-xs">Acción</TableHead>
              <TableHead className="text-xs">Tabla</TableHead>
              <TableHead className="text-xs">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Sin registros de auditoría</TableCell></TableRow>
            ) : filtered.map((l: any) => (
              <TableRow key={l.id} className="border-border/30">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), `dd/MM/yy ${pattern()}`)}</TableCell>
                <TableCell className="text-sm">{l.profiles?.display_name ?? l.profiles?.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[l.action] ?? ''}`}>{l.action}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{l.table_name ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {l.new_data ? JSON.stringify(l.new_data).substring(0, 80) + '…' : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-muted-foreground">{filtered.length} registros mostrados (máx. 500)</p>
    </div>
  );
}
