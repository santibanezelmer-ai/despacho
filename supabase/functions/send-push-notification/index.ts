import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── OAuth2 token generation for FCM HTTP v1 ── */

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const claimB64 = base64url(enc.encode(JSON.stringify(claim)));
  const unsignedJwt = `${headerB64}.${claimB64}`;

  const key = await importPrivateKey(serviceAccount.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsignedJwt));
  const jwt = `${unsignedJwt}.${base64url(sig)}`;

  const res = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth2 token error: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

/* ── Edge function ── */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    console.log('[Push] ─── Request received ───');

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Push] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error('[Push] Auth failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[Push] ✓ Authenticated user: ${userData.user.id}`);

    const { organization_id, emergency_id, title, body, type } = await req.json();
    console.log(`[Push] Payload: org=${organization_id} | emergency=${emergency_id} | title="${title}" | type=${type}`);

    if (!organization_id || !emergency_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is a member of the target organization
    const { data: membership } = await anonClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userData.user.id)
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      console.error(`[Push] User ${userData.user.id} is not a member of org ${organization_id}`);
      return new Response(JSON.stringify({ error: 'Not a member of this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[Push] ✓ Membership verified for org ${organization_id}`);

    // Fetch tokens
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tokens, error: tokensError } = await serviceClient
      .from('device_tokens')
      .select('token, platform, user_id')
      .eq('organization_id', organization_id);

    if (tokensError) {
      console.error('[Push] Error fetching tokens:', tokensError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenCount = tokens?.length ?? 0;
    console.log(`[Push] Found ${tokenCount} device tokens for org ${organization_id}`);

    if (tokenCount === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No devices registered', sent: 0, failed: 0, tokens_count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Load service account & get OAuth2 access token
    const saJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      console.warn('[Push] FCM_SERVICE_ACCOUNT_JSON not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'FCM_SERVICE_ACCOUNT_JSON not set', sent: 0, failed: 0, tokens_count: tokenCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const serviceAccount = JSON.parse(saJson);
    const projectId = serviceAccount.project_id;
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    console.log(`[Push] FCM v1 endpoint: ${fcmEndpoint}`);

    const accessToken = await getAccessToken(serviceAccount);
    console.log('[Push] ✓ OAuth2 access token obtained');

    let sent = 0;
    let failed = 0;

    for (const { token, platform, user_id } of tokens!) {
      const fcmPayload = {
        message: {
          token,
          notification: { title, body: body ?? '' },
          data: { type: type ?? 'new_emergency', emergency_id: emergency_id },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'emergency_alerts',
              sound: 'default',
              default_vibrate_timings: true,
              default_sound: true,
              notification_priority: 'PRIORITY_MAX',
              visibility: 'PUBLIC',
            },
          },
        },
      };

      console.log(`[Push] Sending to ${platform} token ${token.slice(0, 20)}… (user ${user_id})`);

      try {
        const res = await fetch(fcmEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmPayload),
        });
        const result = await res.json();
        console.log(`[Push] FCM v1 status=${res.status} response=${JSON.stringify(result)}`);

        if (res.ok) {
          sent++;
          console.log(`[Push] ✓ Delivered to ${token.slice(0, 12)}…`);
        } else {
          failed++;
          console.warn(`[Push] ✗ FCM rejected ${token.slice(0, 12)}…: ${JSON.stringify(result)}`);
        }
      } catch (e) {
        failed++;
        console.error(`[Push] ✗ Fetch error for ${token.slice(0, 12)}…:`, e);
      }
    }

    const summary = `Push v1: ${sent} delivered, ${failed} failed, ${tokenCount} total`;
    console.log(`[Push] ─── ${summary} ───`);

    return new Response(
      JSON.stringify({ success: true, message: summary, sent, failed, tokens_count: tokenCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[Push] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
