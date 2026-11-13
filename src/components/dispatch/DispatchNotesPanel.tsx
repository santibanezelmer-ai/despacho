import { useState } from 'react';
import { StickyNote, Send, Loader2, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDispatchNotes, useCreateDispatchNote, useArchiveDispatchNote, noteExpiresAt, isNoteCurrent } from '@/hooks/useDispatchNotes';

function remaining(createdAt: string) {
  const ms = noteExpiresAt(createdAt) - Date.now();
  const h = Math.max(0, Math.ceil(ms / 3600000));
  return h >= 24 ? `Vence en ${Math.ceil(h / 24)} día(s)` : `Vence en ${h} h`;
}

export default function DispatchNotesPanel() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const { data: activeNotes } = useDispatchNotes(true);
  const { data: allNotes } = useDispatchNotes(false);
  const notes = tab === 'active' ? activeNotes : allNotes;
  const create = useCreateDispatchNote();
  const archive = useArchiveDispatchNote();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleCreate = async () => {
    if (!content.trim()) return;
    await create.mutateAsync({ title, content });
    setTitle('');
    setContent('');
    setOpen(false);
  };

  return (
    <div className="console-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-info" />
          Comunicados / Notas ({activeNotes?.length ?? 0})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(v => !v)}>
          {open ? 'Cancelar' : 'Nuevo comunicado'}
        </Button>
      </div>

      {open && (
        <div className="mb-4 space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título (opcional)"
            className="bg-background"
          />
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escribe el comunicado informativo..."
            rows={3}
            className="bg-background"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={!content.trim() || create.isPending}>
              {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Publicar
            </Button>
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <Button size="sm" variant={tab === 'active' ? 'default' : 'outline'} onClick={() => setTab('active')}>Activos</Button>
        <Button size="sm" variant={tab === 'history' ? 'default' : 'outline'} onClick={() => setTab('history')}>Historial</Button>
        <span className="self-center text-[11px] text-muted-foreground">Los comunicados vencen a los 3 días.</span>
      </div>
      {(!notes || notes.length === 0) ? (
        <p className="text-xs text-muted-foreground">{tab === 'active' ? 'No hay comunicados activos.' : 'Sin historial.'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {notes.map(n => (
            <div key={n.id} className="rounded-md border border-border bg-muted/20 p-3 relative">
              {isNoteCurrent(n) && <button
                onClick={() => archive.mutate(n.id)}
                title="Archivar"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>}
              {n.title && <h3 className="text-sm font-semibold text-foreground pr-6">{n.title}</h3>}
              <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{n.content}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(n.created_at).toLocaleString('es-CL')}
                <span className="ml-auto">{isNoteCurrent(n) ? remaining(n.created_at) : (n.active ? 'Vencido' : 'Archivado')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
