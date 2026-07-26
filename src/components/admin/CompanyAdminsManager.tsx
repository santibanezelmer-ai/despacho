import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCompanies } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 8;

/**
 * Dedicated screen to assign and manage the "Admin de Compañía" role.
 * Company admin = organization_members.role = 'admin' AND company_id IS NOT NULL.
 */
export default function CompanyAdminsManager() {
  const { orgId, isFullOrgAdmin } = useOrganization();
  const { data: companies } = useCompanies();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['company-admins-manager', orgId],
    enabled: isFullOrgAdmin && !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organization_members')
        .select('id, user_id, role, company_id, status, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'active');
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return (data ?? []).map((m: any) => ({ ...m, profile: map.get(m.user_id) ?? null }));
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ memberId, companyId }: { memberId: string; companyId: string }) => {
      const { error } = await (supabase as any)
        .from('organization_members')
        .update({ role: 'admin', company_id: companyId })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-admins-manager', orgId] });
      qc.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('Admin de Compañía asignado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      // Downgrade to "visor" and clear company scope.
      const { error } = await (supabase as any)
        .from('organization_members')
        .update({ role: 'visor', company_id: null })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-admins-manager', orgId] });
      qc.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('Rol de Admin de Compañía revocado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((m: any) => {
      const isAdminCompany = m.role === 'admin' && !!m.company_id;
      // Show current company admins + candidates (non-admin members) so admins can promote too.
      if (!isAdminCompany && m.role === 'admin') return false; // full org admins excluded from this screen
      if (companyFilter !== 'all') {
        if (companyFilter === 'unassigned') {
          if (isAdminCompany) return false;
        } else if (m.company_id !== companyFilter) {
          return false;
        }
      }
      if (!q) return true;
      const name = (m.profile?.display_name ?? '').toLowerCase();
      const email = (m.profile?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, search, companyFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!isFullOrgAdmin) {
    return null;
  }

  const companyName = (cid: string | null | undefined) =>
    (companies ?? []).find((c: any) => c.id === cid)?.name ?? '—';

  return (
    <div className="console-panel-elevated p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/30">
          <Building2 className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Admins de Compañía</h2>
          <p className="text-xs text-muted-foreground">
            Asigna la administración de una compañía específica. Cada admin sólo verá y gestionará su compañía.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-muted/50 h-9 text-sm"
          />
        </div>
        <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-56 bg-muted/50 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las compañías</SelectItem>
            <SelectItem value="unassigned">Candidatos (sin admin)</SelectItem>
            {(companies ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Usuario</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Rol actual</TableHead>
              <TableHead className="text-xs">Compañía asignada</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : !pageRows.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                  No hay resultados.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((m: any) => {
                const isCompanyAdmin = m.role === 'admin' && !!m.company_id;
                return (
                  <TableRow key={m.id} className="border-border/30">
                    <TableCell className="text-sm font-medium">{m.profile?.display_name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.profile?.email ?? '—'}</TableCell>
                    <TableCell>
                      {isCompanyAdmin ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
                          <Shield className="h-3 w-3 mr-1" /> Admin de Compañía
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.company_id ?? ''}
                        onValueChange={(cid) => assignMutation.mutate({ memberId: m.id, companyId: cid })}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue placeholder="Asignar compañía..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(companies ?? []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {isCompanyAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`¿Revocar admin de "${companyName(m.company_id)}" para ${m.profile?.display_name || m.profile?.email}?`)) {
                              revokeMutation.mutate(m.id);
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Revocar
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

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} usuarios · Página {safePage} de {pageCount}</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={safePage >= pageCount}
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
