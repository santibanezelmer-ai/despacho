import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendResend } from '../resend-service.ts'
import { TEMPLATES } from './registry.ts'

// Server-only: reads LOVABLE_API_KEY. Import from edge functions only — never
// expose sending to the browser.

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
}

/**
 * Sends existing registered administrative templates independently of monthly reports.
 * Preserves the existing suppression list; report delivery remains disabled.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !service) throw new Error('Missing mail server configuration')
  const db = createClient(url, service)

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }
  const { data: suppressed, error: suppressionError } = await db.from('suppressed_emails').select('id').eq('email', recipient.toLowerCase().trim()).limit(1)
  if (suppressionError) throw suppressionError
  if (suppressed?.length) return { sent: false, reason: 'recipient_suppressed' }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  try {
    await sendResend({ channel: 'administrative', to: recipient, subject, html, text, eventKey: options.idempotencyKey || crypto.randomUUID() }, key => Deno.env.get(key))
  } catch (error) {
    throw error
  }

  return { sent: true }
}
