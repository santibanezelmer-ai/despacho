import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log(`[Push] Payload: org=${organization_id} | emergency=${emergency_id} | title="${title}" | body="${body}" | type=${type}`);

    if (!organization_id || !emergency_id || !title) {
      console.error('[Push] Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read all org tokens
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
    if (tokens && tokens.length > 0) {
      for (const t of tokens) {
        console.log(`[Push]   → token=${t.token.slice(0, 20)}… | platform=${t.platform} | user=${t.user_id}`);
      }
    }

    if (tokenCount === 0) {
      console.warn('[Push] No device tokens — nothing to send');
      return new Response(
        JSON.stringify({ success: true, message: 'No devices registered', sent: 0, failed: 0, tokens_count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmKey) {
      console.warn('[Push] FCM_SERVER_KEY not configured — skipping send');
      return new Response(
        JSON.stringify({ success: true, message: 'FCM_SERVER_KEY not set', sent: 0, failed: 0, tokens_count: tokenCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[Push] FCM_SERVER_KEY present (${fcmKey.length} chars)`);

    let sent = 0;
    let failed = 0;

    for (const { token, platform, user_id } of tokens!) {
      const fcmPayload = {
        to: token,
        notification: { title, body: body ?? '' },
        data: { emergencyId: emergency_id, type: type ?? 'new_emergency' },
      };
      console.log(`[Push] Sending to ${platform} token ${token.slice(0, 20)}… (user ${user_id})`);

      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` },
          body: JSON.stringify(fcmPayload),
        });
        const result = await res.json();
        console.log(`[Push] FCM response for ${token.slice(0, 12)}…: ${JSON.stringify(result)}`);

        if (result.success === 1) {
          sent++;
          console.log(`[Push] ✓ Delivered to ${token.slice(0, 12)}…`);
        } else {
          failed++;
          console.warn(`[Push] ✗ FCM rejected ${token.slice(0, 12)}…: ${JSON.stringify(result.results)}`);
        }
      } catch (e) {
        failed++;
        console.error(`[Push] ✗ Fetch error for ${token.slice(0, 12)}…:`, e);
      }
    }

    const summary = `Push: ${sent} delivered, ${failed} failed, ${tokenCount} total`;
    console.log(`[Push] ─── ${summary} ───`);

    return new Response(
      JSON.stringify({ success: true, message: summary, sent, failed, tokens_count: tokenCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Push] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
