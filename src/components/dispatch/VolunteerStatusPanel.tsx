import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Loader2, CheckCircle2, CircleSlash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useVolunteers } from '@/hooks/useVolunteers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type VolunteerStatus = 'activo' | 'inactivo' | 'licencia';

const STATUS_OPTIONS: { value: VolunteerStatus; label: string; className: string }[] = [
  { value: 'activo', label: 'Activo', className: 'border-success bg-success/15 text-success' },
  { value: 'inactivo', label: 'Inactivo', className: 'border-destructive bg-destructive/15 text-destructive' },
  { value: 'licencia', label: 'Licencia', className: 'border-warning bg-warning/15 text-warning' },
];

/**
 * Panel de personal para la consola: permite al operador ajustar el estado
 * (activo/inactivo/licencia) y la disponibilidad usando la misma estructura
 * de datos del módulo de Voluntarios. No crea estados nuevos.
 */
export default function VolunteerStatusPanel() {
  const [search, setSearch] = useState('');
  const { data: volunteers, isLoading } = useVolunteers();
  const { orgId, scopedCompanyId } = useOrganization();
  const { canWrite, user } = useAuth();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async ({
      volunteer,
      patch,
    }: {
      volunteer: any;
      patch: { status?: VolunteerStatus; available?: boolean };
    }) => {
      const { error } = await supabase.from('volunteers').update(patch).eq('id', volunteer.id);
      if (error) throw error;

      if (orgId) {
        await supabase.rpc('insert_audit_log', {
          _organization_id: orgId,
          _action: 'volunteer_status_update',
          _table_name: 'volunteers',
          _record_id: volunteer.id,
          _old_data: { status: volunteer.status, available: volunteer.available } as any,
          _new_data: {
            status: patch.status ?? volunteer.status,
            available: patch.available ?? volunteer.available,
            changed_by: user?.id ?? null,
          } as any,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteers', orgId] });
      toast.success('Estado del personal actualizado');
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar el estado'),
    onSettled: () => setBusyId(null),
  });

  const filtered = useMemo(() => {
    const scoped = (volunteers ?? []).filter((v: any) =>
      scopedCompanyId ? v.company_id === scopedCompanyId : true,
    );
    const term = search.trim().toLowerCase();
    const list = term
      ? scoped.filter((v: any) =>
          [v.name, v.code, v.ranks?.name, v.companies?.name]
            .filter(Boolean)
            .some((f: string) => f.toLowerCase().includes(term)),
        )
      : scoped;
    return list.slice(0, 40);
  }, [volunteers, scopedCompanyId, search]);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Estado del personal
        <span className="ml-auto text-[10px] font-mono">{filtered.length} mostrados</span>
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, número, rango o compañía"
          className="bg-muted/50 pl-8 text-xs"
          spellCheck={false}
        />
      </div>

      {!canWrite && (
        <p className="text-xs text-muted-foreground">Sin permisos para modificar el estado del personal.</p>
      )}

      <div className="space-y-2">
        {filtered.map((v: any) => {
          const busy = busyId === v.id && update.isPending;
          return (
            <div
              key={v.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {v.code ? <span className="font-mono text-muted-foreground">{v.code} · </span> : null}
                  {v.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {[v.ranks?.name, v.companies?.name].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {STATUS_OPTIONS.map(opt => {
                  const active = v.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!canWrite || busy}
                      onClick={() => {
                        if (active) return;
                        setBusyId(v.id);
                        update.mutate({ volunteer: v, patch: { status: opt.value } });
                      }}
                      className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase transition-colors disabled:opacity-50 ${
                        active ? opt.className : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                className="h-7 gap-1 text-[10px]"
                onClick={() => {
                  setBusyId(v.id);
                  update.mutate({ volunteer: v, patch: { available: !v.available } });
                }}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : v.available ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <CircleSlash className="h-3 w-3 text-muted-foreground" />
                )}
                {v.available ? 'Disponible' : 'No disponible'}
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground">Sin personal para mostrar</p>}
      </div>
    </div>
  );
}
