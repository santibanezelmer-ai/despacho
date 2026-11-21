import { describe, expect, it, vi } from 'vitest';
import { EMAIL_SEND_ENABLED, sendResend } from '../../supabase/functions/_shared/resend-service';

const env = (key: string) => ({ LOVABLE_API_KEY: 'test-api', RESEND_API_KEY: 'test-connection' })[key];
const base = { to: 'qa@example.test', subject: 'Invitación', html: '<p>Invitación</p>', eventKey: 'org-invite-test-0' };

describe('existing administrative emails remain independent of monthly delivery', () => {
  it.each(['org-invite-test-0', 'vol-activation-test', 'health-test'])('sends existing administrative event %s while monthly sending is false', async eventKey => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'test-message' }), { status: 200 }));
    expect(EMAIL_SEND_ENABLED).toBe(false);
    expect(await sendResend({ ...base, eventKey, channel: 'administrative' }, env, transport)).toEqual({ providerId: 'test-message', eventKey });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('https://connector-gateway.lovable.dev/resend/emails');
    expect(JSON.parse(options.body)).toMatchObject({ from: 'Operix Dispatch <notificaciones@operixdispatch.com>', to: ['qa@example.test'] });
    expect(options.headers['Idempotency-Key']).toBe(eventKey);
  });
  it.each(['reports', 'operational'] as const)('keeps %s blocked before any transport', async channel => {
    const transport = vi.fn();
    await expect(sendResend({ ...base, channel }, env, transport)).rejects.toThrow('desactivados');
    expect(transport).not.toHaveBeenCalled();
  });
  it('requires server credentials before administrative delivery', async () => {
    const transport = vi.fn();
    await expect(sendResend({ ...base, channel: 'administrative' }, () => undefined, transport)).rejects.toThrow('configuración');
    expect(transport).not.toHaveBeenCalled();
  });
  it('does not report success when the provider rejects an administrative send', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('provider rejected', { status: 403 }));
    await expect(sendResend({ ...base, channel: 'administrative' }, env, transport)).rejects.toThrow('Resend [403]');
  });
});