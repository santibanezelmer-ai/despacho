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

    // Validate auth via getUser (works with any valid JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Push] Missing or invalid Authorization header');
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
    console.log(`[Push] Authenticated user: ${userData.user.id}`);

    const { organization_id, emergency_id, title, body, type } = await req.json();
    console.log(`[Push] Request payload: org=${organization_id}, emergency=${emergency_id}, title="${title}", type=${type}`);

    if (!organization_id || !emergency_id || !title) {
      console.error('[Push] Missing required fields:', { organization_id, emergency_id, title });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read all org tokens
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tokens, error: tokensError } = await serviceClient
      .from('device_tokens')
      .select('token, platform')
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
      console.warn('[Push] No device tokens registered — nothing to send');
      return new Response(
        JSON.stringify({ success: true, message: 'No devices registered', sent: 0, failed: 0, tokens_count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmKey) {
      console.warn('[Push] FCM_SERVER_KEY not configured — skipping actual send');
      return new Response(
        JSON.stringify({ success: true, message: 'FCM_SERVER_KEY not set, skipped send', sent: 0, failed: 0, tokens_count: tokenCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const { token } of tokens!) {
      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` },
          body: JSON.stringify({
            to: token,
            notification: { title, body: body ?? '' },
            data: { emergencyId: emergency_id, type: type ?? 'new_emergency' },
          }),
        });
        const result = await res.json();
        if (result.success === 1) {
          sent++;
          console.log(`[Push] ✓ Sent to token ${token.slice(0, 12)}...`);
        } else {
          failed++;
          console.warn(`[Push] ✗ FCM rejected token ${token.slice(0, 12)}...:`, JSON.stringify(result));
        }
      } catch (e) {
        failed++;
        console.error(`[Push] ✗ Fetch error for token ${token.slice(0, 12)}...:`, e);
      }
    }

    const summary = `Push: ${sent} delivered, ${failed} failed, ${tokenCount} total`;
    console.log(`[Push] ${summary}`);

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
