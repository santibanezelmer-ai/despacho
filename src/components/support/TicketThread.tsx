import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Headset, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddTicketMessage, useTicketMessages, type SupportTicket } from '@/hooks/useSupportTickets';
import { useTimeFormat } from '@/hooks/useTimeFormat';

interface Props {
  ticket: Pick<SupportTicket, 'id' | 'organization_id' | 'status'>;
}

export default function TicketThread({ ticket }: Props) {
  const { data: messages, isLoading } = useTicketMessages(ticket.id);
  const addMessage = useAddTicketMessage();
  const [text, setText] = useState('');
  const { formatDateTime } = useTimeFormat();

  const closed = ticket.status === 'cerrado';

  const handleSend = async () => {
    if (text.trim().length < 2) return;
    try {
      await addMessage.mutateAsync({ ticket, message: text });
      setText('');
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo enviar el mensaje');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
        {isLoading && <p className="text-xs text-muted-foreground">Cargando conversación...</p>}
        {!isLoading && (messages?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Sin respuestas aún.</p>
        )}
        {messages?.map((m) => (
          <div
            key={m.id}
            className={`rounded-md border p-2 text-sm ${
              m.is_support ? 'border-info/30 bg-info/10' : 'border-border bg-card'
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {m.is_support ? <Headset className="h-3 w-3 text-info" /> : <Building2 className="h-3 w-3" />}
              <span>{m.is_support ? 'Soporte Operix' : 'Organización'}</span>
              <span className="font-mono normal-case">· {formatDateTime(m.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-foreground">{m.message}</p>
          </div>
        ))}
      </div>

      {!closed && (
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe una respuesta..."
            rows={2}
            maxLength={2000}
            className="text-sm"
          />
          <Button size="sm" onClick={handleSend} disabled={addMessage.isPending || text.trim().length < 2}>
            {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
      {closed && <p className="text-xs text-muted-foreground">Este ticket está cerrado.</p>}
    </div>
  );
}
