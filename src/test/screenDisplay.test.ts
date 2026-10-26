import { describe, expect, it, vi } from 'vitest';
import { requestScreenDisplay } from '@/lib/screenDisplay';

describe('screen display transport', () => {
  it('rejects HTTP failures instead of treating them as paired data', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(requestScreenDisplay({ action: 'data', secret: 'device-secret' }, fetcher)).rejects.toThrow();
  });
  it('rejects incomplete pairing responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ pin: '123456' })));
    await expect(requestScreenDisplay({ action: 'create' }, fetcher)).rejects.toThrow();
  });
  it('rejects unexpected status instead of replacing the last valid display', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'error' })));
    await expect(requestScreenDisplay({ action: 'data' }, fetcher)).rejects.toThrow();
  });
  it('pairs using the device transport without user Authorization', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ secret: 'device-secret', pin: '123456' })));
    const result = await requestScreenDisplay({ action: 'create' }, fetcher);
    expect(result.pin).toBe('123456');
    const headers = new Headers(fetcher.mock.calls[0][1].headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});