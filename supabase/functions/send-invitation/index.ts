import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email().max(255),
  role: z.enum(['admin', 'operador', 'oficial', 'visor', 'voluntario']),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ error: 'No autenticado' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: 'Sesión inválida' }, 401);
    const caller = userRes.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.errors[0].message }, 400);
    const { organization_id, role } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is admin of the org
    const { data: membership, error: memErr } = await admin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organization_id)
      .eq('user_id', caller.id)
      .eq('status', 'active')
      .maybeSingle();
    if (memErr) return json({ error: memErr.message }, 500);
    if (!membership || membership.role !== 'admin') {
      return json({ error: 'Solo un administrador puede invitar' }, 403);
    }

    // Check if already a member
    const { data: existingUser } = await admin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (existingUser) {
      const { data: existingMem } = await admin
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('user_id', existingUser.user_id)
        .maybeSingle();
      if (existingMem) return json({ error: 'Este usuario ya pertenece a la organización' }, 400);
    }

    // Reuse a pending invitation or create a new one
    const { data: pending } = await admin
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    let invitation = pending;
    if (invitation) {
      const { data: upd, error: updErr } = await admin
        .from('organization_invitations')
        .update({
          role,
          invited_by: caller.id,
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        })
        .eq('id', invitation.id)
        .select()
        .single();
      if (updErr) return json({ error: updErr.message }, 500);
      invitation = upd;
    } else {
      const { data: ins, error: insErr } = await admin
        .from('organization_invitations')
        .insert({ organization_id, email, role, invited_by: caller.id })
        .select()
        .single();
      if (insErr) return json({ error: insErr.message }, 500);
      invitation = ins;
    }

    // Build redirect URL back to the invite acceptance page
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      'https://operixdispatch.com';
    const redirectTo = `${origin.replace(/\/$/, '')}/invite/${invitation.token}`;

    // Send a magic-link / invite email through Supabase Auth (uses the Lovable
    // auth-email-hook + branded template). Works for both new and existing users.
    const { error: otpErr } = await admin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data: { invitation_token: invitation.token, invited_role: role },
      },
    });

    if (otpErr) {
      console.error('signInWithOtp failed', otpErr);
      // Fall back: return invitation so the admin can copy the link manually
      return json(
        {
          success: true,
          email_sent: false,
          invitation,
          invite_url: redirectTo,
          warning: 'La invitación se creó pero no se pudo enviar el email: ' + otpErr.message,
        },
        200,
      );
    }

    return json({ success: true, email_sent: true, invitation, invite_url: redirectTo }, 200);
  } catch (e) {
    console.error('send-invitation error', e);
    return json({ error: e instanceof Error ? e.message : 'Error interno' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
