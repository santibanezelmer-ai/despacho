export const EMAIL_SEND_ENABLED = false;
export const SENDERS = { reports: 'reportes@operixdispatch.com', administrative: 'notificaciones@operixdispatch.com', operational: 'despacho@operixdispatch.com' } as const;
type Message = { channel: keyof typeof SENDERS; to: string; subject: string; html: string; text?: string; eventKey: string };
export async function sendResend(message: Message, env: (key: string) => string | undefined, transport: typeof fetch = fetch) {
  // Existing invitation/activation/health emails remain enabled independently.
  // Monthly reports and operational sends still require explicit authorization.
  if (!EMAIL_SEND_ENABLED && message.channel !== 'administrative') throw new Error('Envíos desactivados: requieren autorización expresa');
  const api = env('LOVABLE_API_KEY'), connection = env('RESEND_API_KEY');
  if (!api || !connection) throw new Error('Falta configuración de correo');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to) || !message.eventKey) throw new Error('Destinatario o evento inválido');
  const response = await transport('https://connector-gateway.lovable.dev/resend/emails', { method: 'POST', headers: { Authorization: `Bearer ${api}`, 'X-Connection-Api-Key': connection, 'Content-Type': 'application/json', 'Idempotency-Key': message.eventKey }, body: JSON.stringify({ from: `Operix Dispatch <${SENDERS[message.channel]}>`, to: [message.to], subject: message.subject, html: message.html, text: message.text }) });
  if (!response.ok) throw new Error(`Resend [${response.status}]: ${await response.text()}`);
  const result = await response.json();
  if (typeof result.id !== 'string') throw new Error('Respuesta de envío inválida');
  return { providerId: result.id, eventKey: message.eventKey };
}
