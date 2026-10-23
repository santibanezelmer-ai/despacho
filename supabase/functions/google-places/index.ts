// Buscador de direcciones con Google Places (New) para la ventana de despacho.
// Requiere sesión válida; las credenciales de Google nunca salen del servidor.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const SAFETY_RADIUS_M = 50000;
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('autocomplete'),
    input: z.string().trim().min(3).max(200),
    sessionToken: z.string().uuid(),
    near: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
  }),
  z.object({
    action: z.literal('details'),
    placeId: z.string().min(5).max(300).regex(/^[A-Za-z0-9_-]+$/),
    sessionToken: z.string().uuid().optional(),
  }),
]);

async function gatewayError(res: Response) {
  const text = await res.text();
  console.error(`Google Places failed [${res.status}]: ${text}`);
  return json({ error: 'Google Places no respondió', status: res.status, details: text }, res.status === 403 ? 403 : 502);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Sesión requerida' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(jwt);
  if (claimsErr || !claims?.claims?.sub) return json({ error: 'Sesión requerida' }, 401);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return json({ error: 'Google Maps no está configurado' }, 500);

  let parsed;
  try { parsed = Body.safeParse(await req.json()); } catch { return json({ error: 'JSON inválido' }, 400); }
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  const headers = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
    'Content-Type': 'application/json',
  };

  try {
    if (body.action === 'autocomplete') {
      const payload: Record<string, unknown> = {
        input: body.input,
        sessionToken: body.sessionToken,
        languageCode: 'es',
        includedRegionCodes: ['cl'],
      };
      if (body.near) {
        // Restricción estricta (no sesgo): Google no devuelve lugares fuera del círculo de seguridad.
        payload.locationRestriction = { circle: { center: { latitude: body.near.lat, longitude: body.near.lng }, radius: SAFETY_RADIUS_M } };
        payload.origin = { latitude: body.near.lat, longitude: body.near.lng };
      }
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Goog-FieldMask':
            'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text.text,suggestions.placePrediction.distanceMeters',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return await gatewayError(res);
      const data = await res.json();
      const suggestions = (data?.suggestions ?? [])
        .map((s: any) => s.placePrediction)
        .filter((p: any) => p?.placeId)
        // Validación propia independiente del proveedor.
        .filter((p: any) => !body.near || typeof p.distanceMeters !== 'number' || p.distanceMeters <= SAFETY_RADIUS_M)
        .slice(0, 6)
        .map((p: any) => ({
          placeId: p.placeId,
          main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
          distanceMeters: typeof p.distanceMeters === 'number' ? p.distanceMeters : null,
        }));
      return json({ suggestions });
    }

    const qs = body.sessionToken ? `?sessionToken=${body.sessionToken}&languageCode=es` : '?languageCode=es';
    const res = await fetch(`${GATEWAY_URL}/places/v1/places/${body.placeId}${qs}`, {
      headers: { ...headers, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents' },
    });
    if (!res.ok) return await gatewayError(res);
    const p = await res.json();
    if (typeof p?.location?.latitude !== 'number' || typeof p?.location?.longitude !== 'number') {
      return json({ error: 'El lugar no tiene coordenadas' }, 404);
    }
    const comp = (type: string) =>
      (p.addressComponents ?? []).find((c: any) => (c.types ?? []).includes(type))?.longText ?? null;
    return json({
      place: {
        placeId: p.id,
        name: p.displayName?.text ?? null,
        address: p.formattedAddress ?? null,
        latitude: p.location.latitude,
        longitude: p.location.longitude,
        street: comp('route'),
        locality: comp('locality'),
        commune: comp('administrative_area_level_3') ?? comp('locality'),
        region: comp('administrative_area_level_1'),
      },
    });
  } catch (e) {
    console.error('google-places error', e);
    return json({ error: 'Error consultando Google Places' }, 502);
  }
});
