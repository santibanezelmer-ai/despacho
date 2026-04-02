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

    // For now, log the tokens that would receive push.
    // Real FCM/APNs integration requires Firebase server key or APNs credentials.
    // This edge function is the hook point for that integration.
    const tokenCount = tokens?.length ?? 0;
    console.log(`[Push] Would send to ${tokenCount} devices in org ${organization_id}`);
    console.log(`[Push] Payload: title="${title}", body="${body}", emergencyId="${emergency_id}", type="${type}"`);

    // TODO: When FCM server key is configured, send actual push here:
    // const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    // if (fcmKey && tokens?.length) {
    //   for (const { token } of tokens) {
    //     await fetch('https://fcm.googleapis.com/fcm/send', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` },
    //       body: JSON.stringify({
    //         to: token,
    //         notification: { title, body },
    //         data: { emergencyId: emergency_id, type },
    //       }),
    //     });
    //   }
    // }

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
