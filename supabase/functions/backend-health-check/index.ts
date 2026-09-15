import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const ALERT_EMAIL = 'Contacto@operixdistpach.com'
const ALERT_TEMPLATE = 'backend-health-alert'
const ALERT_LOG_NAME = 'backend_health_alert'
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
      .eq('template_name', ALERT_LOG_NAME)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const canSend =
      !recentAlert?.created_at ||
      new Date().getTime() - new Date(recentAlert.created_at).getTime() >
        ALERT_COOLDOWN_MINUTES * 60 * 1000

    if (canSend) {
      const messageId = `health-alert-${checkId}`
      try {
        const result = await sendTemplateEmail(ALERT_TEMPLATE, ALERT_EMAIL, {
          templateData: { message, checkId, checkedAt },
          idempotencyKey: messageId,
        })

        if (result.sent) {
          const { error: logError } = await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: ALERT_LOG_NAME,
            recipient_email: ALERT_EMAIL,
            status: 'sent',
          })
          if (logError) console.error('[HealthCheck] Failed to log alert send', logError)
          console.log('[HealthCheck] Alert email sent', { checkId })
        } else {
          const { error: logError } = await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: ALERT_LOG_NAME,
            recipient_email: ALERT_EMAIL,
            status: 'suppressed',
          })
          if (logError) console.error('[HealthCheck] Failed to log suppressed alert', logError)
          console.warn('[HealthCheck] Alert recipient is suppressed', { checkId })
        }
      } catch (sendError) {
        const sendMessage = sendError instanceof Error ? sendError.message : String(sendError)
        console.error('[HealthCheck] Failed to send alert email', { checkId, error: sendMessage })
        const { error: logError } = await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: ALERT_LOG_NAME,
          recipient_email: ALERT_EMAIL,
          status: 'failed',
          error_message: sendMessage.slice(0, 1000),
        })
        if (logError) console.error('[HealthCheck] Failed to log alert failure', logError)
      }
    } else {
      console.log('[HealthCheck] Alert skipped (cooldown)', { checkId })
    }

    return json({ status: 'error', error: message, checkId, checkedAt }, 503)
  }
})
