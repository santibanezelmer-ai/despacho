/** A created invitation is not proof of email delivery. */
export function invitationEmailSent(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const response = result as { error?: unknown; email_sent?: unknown };
  return !response.error && response.email_sent === true;
}