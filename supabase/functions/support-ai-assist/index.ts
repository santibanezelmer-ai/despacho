import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'X-Lovable-AIG-Run-ID',
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra, 'Content-Type': 'application/json' } });

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['priority', 'category', 'justification', 'suggested_reply'],
  properties: {
    priority: { type: 'string', enum: ['baja', 'media', 'alta', 'critica'] },
    category: { type: 'string', enum: ['despacho', 'notificaciones', 'pwa', 'mapas', 'usuarios', 'facturacion', 'error', 'otro'] },
    justification: { type: 'string' },
    suggested_reply: { type: 'string' },
  },
};

const instructions = `Eres el equipo de soporte de Operix Dispatch, un SaaS de despacho de emergencias para cuerpos de bomberos de Chile (consola de despacho, móviles, voluntarios, mapas Leaflet, app PWA/Android con notificaciones push).
Clasifica la prioridad: "critica" si impide despachar emergencias o caída total; "alta" si afecta operación (notificaciones, GPS, mapas) sin alternativa; "media" si hay alternativa; "baja" para consultas o mejoras.
Redacta en español de Chile una respuesta breve (máx. 150 palabras), cordial y profesional, con pasos concretos. No inventes funciones ni plazos. Justificación en una frase.`;

/** Llamada directa a Google Gemini con la API key propia del proyecto. */
async function callGemini(key: string, input: string) {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts: [{ text: input }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            required: ['priority', 'category', 'justification', 'suggested_reply'],
            properties: {
              priority: { type: 'STRING', enum: ['baja', 'media', 'alta', 'critica'] },
              category: { type: 'STRING', enum: ['despacho', 'notificaciones', 'pwa', 'mapas', 'usuarios', 'facturacion', 'error', 'otro'] },
              justification: { type: 'STRING' },
              suggested_reply: { type: 'STRING' },
            },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    let msg = t;
    try { msg = JSON.parse(t)?.error?.message ?? t; } catch { /* */ }
    return { ok: false as const, status: res.status, error: msg };
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  try {
    return { ok: true as const, result: { ...JSON.parse(text), engine: 'gemini' } };
  } catch {
    return { ok: false as const, status: 502, error: 'Gemini no devolvió una respuesta válida' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: isSa } = await userClient.rpc('is_superadmin');
    if (isSa !== true) return json({ error: 'Solo superadmin' }, 403);

    const { content, context } = await req.json();
    if (!content || typeof content !== 'string' || content.length > 8000)
      return json({ error: 'Contenido del ticket inválido (máx. 8000 caracteres)' }, 400);

    const input = `Ticket:\n${content}\n\nContexto de la organización:\n${context ? JSON.stringify(context) : 'sin datos'}`;

    // 1) Gemini con la API key propia, si está configurada.
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey) {
      const g = await callGemini(geminiKey, input);
      if (g.ok) return json(g.result, 200);
      console.error('[support-ai-assist] Gemini falló, usando respaldo:', g.status, g.error);
    }

    // 2) Respaldo: Gemini a través de la plataforma.
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return json({ error: 'Falta configurar la IA' }, 500);

    const runId = req.headers.get('X-Lovable-AIG-Run-ID')?.trim();
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
        'X-Lovable-AIG-SDK': 'fetch',
        ...(runId ? { 'X-Lovable-AIG-Run-ID': runId } : {}),
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        instructions,
        input,
        stream: true,
        store: false,
        reasoning: { effort: 'low' },
        text: { format: { type: 'json_schema', name: 'ticket_triage', strict: true, schema } },
      }),
    });
    const gotRun = res.headers.get('X-Lovable-AIG-Run-ID') ?? runId ?? '';
    const hdr = gotRun ? { 'X-Lovable-AIG-Run-ID': gotRun } : {};

    if (!res.ok || !res.body) {
      const t = await res.text();
      let msg = t;
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? t; } catch { /* */ }
      const friendly = res.status === 402 ? 'Sin créditos de IA disponibles. Recarga créditos en tu espacio de trabajo.'
        : res.status === 429 ? 'Demasiadas solicitudes a la IA, intenta en un momento.' : msg;
      return json({ error: friendly }, res.status, hdr);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', text = '', failed = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const d = line.slice(5).trim();
        if (!d || d === '[DONE]') continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === 'response.output_text.delta') text += ev.delta;
          else if (ev.type === 'response.refusal.delta') failed = 'La IA rechazó procesar este contenido.';
          else if (ev.type === 'response.failed' || ev.type === 'error') failed = ev.response?.error?.message ?? ev.message ?? 'Error de la IA';
        } catch { /* ignore */ }
      }
    }
    if (failed) return json({ error: failed }, 502, hdr);
    try {
      return json({ ...JSON.parse(text), engine: 'plataforma' }, 200, hdr);
    } catch {
      return json({ error: 'La IA no devolvió una respuesta válida' }, 502, hdr);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
