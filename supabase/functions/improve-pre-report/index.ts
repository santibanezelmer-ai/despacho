import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const instructions = `Eres redactor técnico de un Cuerpo de Bomberos de Chile. Reescribe el preinforme de emergencia que entrega el operador en español formal, con terminología bomberil chilena, frases claras y ortografía correcta.
Reglas estrictas:
- NO inventes datos: ni víctimas, daños, recursos, unidades, cargos, horas, ni causas que no estén en el texto.
- Conserva exactamente códigos de unidades (B-1, R-2...), claves radiales (10-0, 6-3...), cargos, nombres, números y direcciones.
- Expande abreviaturas solo si su significado es inequívoco.
- Máximo un párrafo breve o viñetas cortas. Sin título, sin saludo, sin comentarios. Devuelve solo el texto final.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authErr } = await client.auth.getClaims(auth.replace('Bearer ', ''));
    if (authErr || !claims?.claims?.sub) return json({ error: 'No autorizado' }, 401);

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (text.length < 3 || text.length > 4000) return json({ error: 'El preinforme debe tener entre 3 y 4000 caracteres' }, 400);
    const ctx = [
      typeof body?.code === 'string' && body.code ? `Clave: ${body.code.slice(0, 60)}` : '',
      typeof body?.address === 'string' && body.address ? `Dirección: ${body.address.slice(0, 200)}` : '',
    ].filter(Boolean).join('\n');

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ error: 'Falta configurar Gemini' }, 500);
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: 'user', parts: [{ text: `${ctx ? ctx + '\n\n' : ''}Preinforme:\n${text}` }] }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) {
      console.error('[improve-pre-report] Gemini', res.status, await res.text());
      return json({ error: res.status === 429 ? 'Demasiadas solicitudes, intenta en un momento' : 'La IA no respondió' }, 502);
    }
    const data = await res.json();
    const out = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
    if (!out) return json({ error: 'La IA no devolvió texto' }, 502);
    return json({ text: out });
  } catch (e) {
    console.error('[improve-pre-report]', e);
    return json({ error: 'Error interno' }, 500);
  }
});
