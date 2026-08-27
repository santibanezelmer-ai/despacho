import { useState } from 'react';
import { toast } from 'sonner';
import { LifeBuoy, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import TicketThread from '@/components/support/TicketThread';
import {
  useOrgSupportTickets, useCreateSupportTicket, SUPPORT_CATEGORIES,
  STATUS_LABEL, PRIORITY_LABEL, type SupportPriority, type SupportStatus,
} from '@/hooks/useSupportTickets';

const statusStyle: Record<SupportStatus, string> = {
  abierto: 'bg-warning/15 text-warning border-warning/30',
  en_proceso: 'bg-info/15 text-info border-info/30',
  resuelto: 'bg-success/15 text-success border-success/30',
  cerrado: 'bg-muted text-muted-foreground border-border',
};

export default function SupportPage() {
  const { currentOrg } = useOrganization();
  const { data: tickets, isLoading } = useOrgSupportTickets();
  const createTicket = useCreateSupportTicket();
  const { formatDateTime } = useTimeFormat();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState<SupportPriority>('media');
  const [description, setDescription] = useState('');

  const reset = () => {
    setSubject(''); setCategory('general'); setPriority('media'); setDescription('');
  };

  const handleCreate = async () => {
    if (subject.trim().length < 4) { toast.error('Indica un asunto claro'); return; }
    if (description.trim().length < 10) { toast.error('Describe el problema con más detalle'); return; }
    try {
      await createTicket.mutateAsync({ subject, category, priority, description });
      toast.success('Ticket enviado al soporte de Operix Dispatch');
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo crear el ticket');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <LifeBuoy className="h-5 w-5 text-info" /> Soporte
          </h1>
          <p className="text-xs text-muted-foreground">
            Tickets de {currentOrg?.organization?.name ?? 'tu organización'} enviados al administrador de Operix Dispatch.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo ticket
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && (tickets?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Aún no has enviado tickets de soporte.</p>
        </div>
      )}

      <div className="space-y-2">
        {tickets?.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="flex w-full items-start justify-between gap-3 p-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t.subject}</p>
                <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                  {formatDateTime(t.created_at, { withYear: true })} ·{' '}
                  {SUPPORT_CATEGORIES.find(c => c.value === t.category)?.label ?? t.category} ·{' '}
                  Prioridad {PRIORITY_LABEL[t.priority]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={statusStyle[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                {expanded === t.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {expanded === t.id && (
              <div className="space-y-3 border-t border-border p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{t.description}</p>
                <TicketThread ticket={t} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo ticket de soporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Asunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Ej: No se reproducen los tonos de despacho" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as SupportPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_LABEL) as SupportPriority[]).map(p => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Descripción del problema</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="Describe qué ocurrió, en qué módulo y los pasos para reproducirlo."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={createTicket.isPending}>
              {createTicket.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Enviar ticket
            </Button>
          </DialogFooter>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
