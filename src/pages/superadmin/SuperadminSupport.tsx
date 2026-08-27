import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LifeBuoy, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAllSupportTickets, useUpdateTicketStatus, SUPPORT_CATEGORIES,
  STATUS_LABEL, PRIORITY_LABEL, type SupportStatus,
} from '@/hooks/useSupportTickets';
import TicketThread from '@/components/support/TicketThread';

const statusStyle: Record<SupportStatus, string> = {
  abierto: 'bg-warning/15 text-warning border-warning/30',
  en_proceso: 'bg-info/15 text-info border-info/30',
  resuelto: 'bg-success/15 text-success border-success/30',
  cerrado: 'bg-muted text-muted-foreground border-border',
};

export default function SuperadminSupport() {
  const { data: tickets, isLoading } = useAllSupportTickets();
  const updateStatus = useUpdateTicketStatus();
  const [filter, setFilter] = useState<'todos' | SupportStatus>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tickets ?? []).filter(t => filter === 'todos' || t.status === filter),
    [tickets, filter],
  );

  const counts = useMemo(() => {
    const base = { abierto: 0, en_proceso: 0, resuelto: 0, cerrado: 0 } as Record<SupportStatus, number>;
    (tickets ?? []).forEach(t => { base[t.status] += 1; });
    return base;
  }, [tickets]);

  const handleStatus = async (id: string, status: SupportStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success('Estado actualizado');
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo actualizar el estado');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <LifeBuoy className="h-5 w-5 text-info" /> Tickets de soporte
          </h1>
          <p className="text-xs text-muted-foreground">
            Solicitudes enviadas por las organizaciones del SaaS.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({tickets?.length ?? 0})</SelectItem>
            {(Object.keys(STATUS_LABEL) as SupportStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]} ({counts[s]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Sin tickets para este filtro.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3 p-3">
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold text-foreground">{t.subject}</p>
                <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                  {t.organizations?.name ?? 'Organización'} ·{' '}
                  {new Date(t.created_at).toLocaleString('es-CL')} ·{' '}
                  {SUPPORT_CATEGORIES.find(c => c.value === t.category)?.label ?? t.category} ·{' '}
                  Prioridad {PRIORITY_LABEL[t.priority]}
                  {t.contact_email ? ` · ${t.contact_email}` : ''}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={statusStyle[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                <Select value={t.status} onValueChange={(v) => handleStatus(t.id, v as SupportStatus)}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as SupportStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="text-muted-foreground">
                  {expanded === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expanded === t.id && (
              <div className="space-y-3 border-t border-border p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{t.description}</p>
                {t.route && <p className="text-[11px] font-mono text-muted-foreground">Ruta reportada: {t.route}</p>}
                <TicketThread ticket={t} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
