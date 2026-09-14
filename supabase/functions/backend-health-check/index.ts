import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const ALERT_EMAIL = 'Contacto@operixdistpach.com'
const ALERT_COOLDOWN_MINUTES = 30

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const checkId = crypto.randomUUID()
  const checkedAt = new Date().toISOString()

  try {
    // Simple connectivity check against a small table.
    const { error } = await supabase.from('demo_settings').select('id').limit(1)
    if (error) throw error

    console.log('[HealthCheck] OK', { checkId, checkedAt })
    return json({ status: 'ok', checkId, checkedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[HealthCheck] FAILED', { checkId, checkedAt, error: message })

    // Send alert email only if we haven't sent one recently.
    const { data: recentAlert } = await supabase
      .from('email_send_log')
      .select('created_at')
      .eq('template_name', 'backend_health_alert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const canSend =
      !recentAlert?.created_at ||
      new Date().getTime() - new Date(recentAlert.created_at).getTime() >
        ALERT_COOLDOWN_MINUTES * 60 * 1000

    if (canSend) {
      const alertPayload = {
        to: ALERT_EMAIL,
        subject: 'ALERTA: Operix backend no responde',
        html: `<p>La verificación de salud del backend de Operix falló.</p>
<p><strong>Error:</strong> ${message}</p>
<p><strong>Check ID:</strong> ${checkId}</p>
<p><strong>Hora UTC:</strong> ${checkedAt}</p>`,
        text: `La verificación de salud del backend de Operix falló. Error: ${message}. Check ID: ${checkId}. Hora UTC: ${checkedAt}`,
        purpose: 'transactional',
        label: 'backend_health_alert',
        message_id: `health-alert-${checkId}`,
      }

      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: alertPayload,
      })

      if (enqueueError) {
        console.error('[HealthCheck] Failed to enqueue alert email', enqueueError)
      } else {
        console.log('[HealthCheck] Alert email enqueued', { checkId, to: ALERT_EMAIL })
      }
    } else {
      console.log('[HealthCheck] Alert skipped (cooldown)', { checkId })
    }

    return json({ status: 'error', error: message, checkId, checkedAt }, 503)
  }
})
