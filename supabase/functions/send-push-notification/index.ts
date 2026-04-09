import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.100.0/cors';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organization_id, emergency_id, title, body, type } = await req.json();

    if (!organization_id || !emergency_id || !title) {
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
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenCount = tokens?.length ?? 0;
    console.log(`[Push] Sending to ${tokenCount} devices in org ${organization_id}`);

    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    let sent = 0;
    let failed = 0;

    if (fcmKey && tokens?.length) {
      for (const { token } of tokens) {
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` },
            body: JSON.stringify({
              to: token,
              notification: { title, body },
              data: { emergencyId: emergency_id, type },
            }),
          });
          const result = await res.json();
          if (result.success === 1) {
            sent++;
          } else {
            failed++;
            console.warn(`[Push] FCM error for token ${token.slice(0, 10)}...:`, result);
          }
        } catch (e) {
          failed++;
          console.error(`[Push] Fetch error for token ${token.slice(0, 10)}...:`, e);
        }
      }
    } else if (!fcmKey) {
      console.warn('[Push] FCM_SERVER_KEY not configured — skipping send');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push queued for ${tokenCount} devices`,
        tokens_count: tokenCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Push] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
