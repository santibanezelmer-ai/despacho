import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Result = { priority: 'baja' | 'media' | 'alta' | 'critica'; category: string; justification: string; suggested_reply: string; engine?: string };

const prioStyle: Record<Result['priority'], string> = {
  baja: 'border-border text-muted-foreground',
  media: 'border-info/40 text-info',
  alta: 'border-warning/40 text-warning',
  critica: 'border-destructive/40 text-destructive',
};

export default function SupportAiAssistant({
  initialContent = '', context, onUseReply, compact = false,
}: { initialContent?: string; context?: Record<string, unknown>; onUseReply?: (text: string) => void; compact?: boolean }) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!content.trim()) { toast.error('Ingresa el contenido del ticket'); return; }
    setLoading(true); setError(null); setResult(null);
    const { data, error } = await supabase.functions.invoke('support-ai-assist', { body: { content, context } });
    setLoading(false);
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* */ }
      setError(msg);
      return;
    }
    if ((data as any)?.error) { setError((data as any).error); return; }
    setResult(data as Result);
  };

  return (
    <div className="space-y-3 rounded-lg border border-info/30 bg-info/5 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-info" /> Asistente IA de soporte
      </div>
      {!compact && (
        <Textarea value={content} onChange={e => setContent(e.target.value)} maxLength={8000}
          placeholder="Pega aquí el contenido del ticket o el mensaje del cliente..." className="h-28 text-sm" />
      )}
      <Button size="sm" onClick={run} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? 'Analizando...' : 'Clasificar y proponer respuesta'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={prioStyle[result.priority]}>Prioridad {result.priority}</Badge>
            <Badge variant="outline">{result.category}</Badge>
            {result.engine === 'gemini' && <Badge variant="outline" className="border-info/40 text-info">Gemini</Badge>}
            <span className="text-muted-foreground">{result.justification}</span>
          </div>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-2 text-sm text-foreground">{result.suggested_reply}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(result.suggested_reply); toast.success('Respuesta copiada'); }}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            {onUseReply && <Button size="sm" variant="outline" onClick={() => onUseReply(result.suggested_reply)}>Usar en el hilo</Button>}
          </div>
          <p className="text-[10px] text-muted-foreground">Sugerencia generada por IA: revísala antes de enviarla.</p>
        </div>
      )}
    </div>
  );
}
