import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

const EXPECTED_PROJECT_ID = 'operix-dispatch'; // Must match android/app/google-services.json

/* ── OAuth2 token generation for FCM HTTP v1 ── */

function base64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
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
    throw new Error(`OAuth2 token error (status ${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

/* ── Helper: detect FCM errors that mean the token is dead ── */
function isDeadTokenError(fcmResponse: any): boolean {
  try {
    const code = fcmResponse?.error?.status;
    const errorCode = fcmResponse?.error?.details?.[0]?.errorCode;
    return (
      code === 'NOT_FOUND' ||
      code === 'INVALID_ARGUMENT' ||
      errorCode === 'UNREGISTERED' ||
      errorCode === 'INVALID_ARGUMENT'
    );
  } catch {
    return false;
  }
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
    console.log(
      `[Push] Payload: org=${organization_id} | emergency=${emergency_id} | title="${title}" | type=${type}`,
    );

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

    // Service role for tokens & cleanup
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tokens, error: tokensError } = await serviceClient
      .from('device_tokens')
      .select('id, token, platform, user_id')
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
        JSON.stringify({
          success: true,
          message: 'No devices registered',
          sent: 0,
          failed: 0,
          tokens_count: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Load service account & validate
    const saJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      console.warn('[Push] FCM_SERVICE_ACCOUNT_JSON not configured');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'FCM_SERVICE_ACCOUNT_JSON not set',
          sent: 0,
          failed: 0,
          tokens_count: tokenCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let serviceAccount: {
      project_id: string;
      client_email: string;
      private_key: string;
      token_uri: string;
    };
    try {
      serviceAccount = JSON.parse(saJson);
    } catch (e) {
      console.error('[Push] FCM_SERVICE_ACCOUNT_JSON is not valid JSON:', (e as Error).message);
      return new Response(
        JSON.stringify({ error: 'FCM_SERVICE_ACCOUNT_JSON invalid JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const projectId = serviceAccount.project_id;
    console.log(`[Push] Service account project_id=${projectId} | client_email=${serviceAccount.client_email}`);

    if (projectId !== EXPECTED_PROJECT_ID) {
      console.error(
        `[Push] ⚠️ project_id mismatch! SA="${projectId}" but Android app expects "${EXPECTED_PROJECT_ID}". ` +
          `Tokens were generated for "${EXPECTED_PROJECT_ID}" so all sends will fail with SenderId mismatch.`,
      );
    }

    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    console.log(`[Push] FCM v1 endpoint: ${fcmEndpoint}`);

    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccount);
      console.log(`[Push] ✓ OAuth2 access token obtained (length=${accessToken.length})`);
    } catch (e) {
      console.error('[Push] ✗ Failed to obtain OAuth2 token:', (e as Error).message);
      return new Response(
        JSON.stringify({ error: 'OAuth2 failure', detail: (e as Error).message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    let failed = 0;
    const deadTokenIds: string[] = [];
    const logEntries: Array<{
      organization_id: string;
      emergency_id: string;
      user_id: string;
      device_token: string;
      status: string;
      error_message: string | null;
    }> = [];

    for (const { id: tokenId, token, platform, user_id } of tokens!) {
      const isWeb = platform === 'web';
      const emergencyPath = `/voluntario/emergencia/${emergency_id}`;
      const fcmPayload: any = {
        message: {
          token,
          data: {
            type: String(type ?? 'new_emergency'),
            emergency_id: String(emergency_id),
            emergencyId: String(emergency_id),
            title: String(title),
            body: String(body ?? ''),
          },
        },
      };
      if (isWeb) {
        // IMPORTANT: data-only (no top-level `notification`) so the SW's
        // onBackgroundMessage fires and can play the custom dispatch tone
        // instead of the browser/OS default notification sound.
        fcmPayload.message.webpush = {
          headers: { Urgency: 'high', TTL: '600' },
          fcm_options: { link: emergencyPath },
        };
      } else {
        // Native Android: keep notification block so system tray shows it.
        fcmPayload.message.notification = { title, body: body ?? '' };
        fcmPayload.message.android = {
          priority: 'HIGH',
          notification: {
            channel_id: 'emergency_alerts',
            sound: 'default',
            default_vibrate_timings: true,
            default_sound: true,
            notification_priority: 'PRIORITY_MAX',
            visibility: 'PUBLIC',
            icon: 'ic_notification',
          },
        };
      }

      console.log(
        `[Push] → Sending to ${platform} | tokenId=${tokenId} | token=${token.slice(0, 25)}… | user=${user_id}`,
      );

      try {
        const res = await fetch(fcmEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmPayload),
        });
        const resText = await res.text();
        let result: any = {};
        try {
          result = JSON.parse(resText);
        } catch {
          result = { raw: resText };
        }

        console.log(`[Push] ← FCM status=${res.status} body=${resText}`);

        if (res.ok) {
          sent++;
          logEntries.push({
            organization_id,
            emergency_id,
            user_id,
            device_token: token,
            status: 'sent',
            error_message: null,
          });
        } else {
          failed++;
          const dead = isDeadTokenError(result);
          if (dead) {
            console.log(`[Push] 💀 Dead token detected (${tokenId}). Will be removed from device_tokens.`);
            deadTokenIds.push(tokenId);
          }
          logEntries.push({
            organization_id,
            emergency_id,
            user_id,
            device_token: token,
            status: 'failed',
            error_message: `${dead ? '[UNREGISTERED] ' : ''}${resText}`.slice(0, 500),
          });
        }
      } catch (e: any) {
        failed++;
        console.error(`[Push] ✗ Network error sending to ${tokenId}:`, e?.message);
        logEntries.push({
          organization_id,
          emergency_id,
          user_id,
          device_token: token,
          status: 'failed',
          error_message: (e?.message ?? 'fetch error').slice(0, 500),
        });
      }
    }

    // Cleanup dead tokens
    if (deadTokenIds.length > 0) {
      const { error: delError, count } = await serviceClient
        .from('device_tokens')
        .delete({ count: 'exact' })
        .in('id', deadTokenIds);
      if (delError) {
        console.error('[Push] Failed to delete dead tokens:', delError.message);
      } else {
        console.log(`[Push] 🗑 Removed ${count ?? deadTokenIds.length} dead tokens`);
      }
    }

    // Insert tracking logs
    if (logEntries.length > 0) {
      const { error: logError } = await serviceClient.from('notification_log').insert(logEntries);
      if (logError) {
        console.error('[Push] Failed to insert notification_log:', logError.message);
      } else {
        console.log(`[Push] ✓ ${logEntries.length} notification_log entries saved`);
      }
    }

    const summary = `Push v1: ${sent} delivered, ${failed} failed, ${tokenCount} total, ${deadTokenIds.length} pruned`;
    console.log(`[Push] ─── ${summary} ───`);

    return new Response(
      JSON.stringify({
        success: true,
        message: summary,
        sent,
        failed,
        tokens_count: tokenCount,
        pruned: deadTokenIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[Push] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: (err as Error)?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
