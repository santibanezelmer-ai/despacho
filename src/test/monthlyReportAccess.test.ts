import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import { randomReportToken, hashReportToken, reportAccessLinks, reportAccessState } from '../../supabase/functions/monthly-report-access/_shared/report-access';
import { handleReportAccess } from '../../supabase/functions/monthly-report-access/_shared/access-handler';
import { sendResend } from '../../supabase/functions/monthly-report-access/_shared/resend-service';
import { captureReportSecret, requestReportAccess } from '../lib/monthlyReportAccessClient';

beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal('crypto', webcrypto); });
const request = () => new Request('https://operixdispatch.com', { method: 'POST' });
const deps = (state = 'active') => ({ db: { rpc: vi.fn().mockResolvedValue({ data: { state, report: { organizationId: 'org-a', period: '2026-10' }, expires_at: '2026-12-05T13:00:00Z' }, error: null }) }, userId: vi.fn().mockResolvedValue(null), abuseAllowed: vi.fn().mockResolvedValue(true), pdf: vi.fn().mockResolvedValue(new TextEncoder().encode('%PDF-1.4').buffer) });
describe('installed monthly report access security', () => {
  it('uses 32 random bytes (256 bits) and a 64-character SHA-256 digest only', async () => {
    const token = randomReportToken(); expect(token).toMatch(/^[0-9a-f]{64}$/); const hash = await hashReportToken(token); expect(hash).toHaveLength(64); expect(hash).not.toBe(token); expect(randomReportToken()).not.toBe(token);
  });
  it('valid token returns only its bound report without requesting a user session', async () => {
    const d = deps(); const token = randomReportToken(); const result = await handleReportAccess(request(), { action: 'view', token }, d);
    expect(result.status).toBe(200); expect(result.body).toMatchObject({ report: { organizationId: 'org-a', period: '2026-10' } }); expect(d.userId).not.toHaveBeenCalled(); expect(d.db.rpc).toHaveBeenCalledWith('monthly_report_consume', { _hash: await hashReportToken(token), _action: 'view' }); expect(JSON.stringify(d.db.rpc.mock.calls)).not.toContain(token);
  });
  it.each(['expired','revoked','invalid'])('rejects %s tokens for both queries and downloads', async state => {
    for (const action of ['view','download'] as const) { const d = deps(state); const result = await handleReportAccess(request(), { action, token: randomReportToken() }, d); expect(result.status).toBe(state === 'invalid' ? 404 : 410); expect(result.body).toEqual({ state }); expect(d.pdf).not.toHaveBeenCalled(); }
  });
  it('rejects attempts to change organization, month or personal information selectors', async () => {
    for (const key of ['organization_id','period','volunteer_id']) { const d = deps(); const result = await handleReportAccess(request(), { action: 'view', token: randomReportToken(), [key]: 'foreign' } as any, d); expect(result.status).toBe(400); expect(d.db.rpc).not.toHaveBeenCalled(); }
  });
  it('downloads PDF without session and revalidates through backend consume', async () => {
    const d = deps(); const result = await handleReportAccess(request(), { action: 'download', token: randomReportToken() }, d); expect(result.pdf?.byteLength).toBeGreaterThan(0); expect(result.filename).toBe('operix-reporte-2026-10.pdf'); expect(d.userId).not.toHaveBeenCalled(); expect(d.db.rpc.mock.calls[0][1]._action).toBe('download');
  });
  it('revocation stops the next download immediately', async () => {
    const d = deps(); const token = randomReportToken(); expect((await handleReportAccess(request(), { action: 'view', token }, d)).status).toBe(200);
    d.db.rpc.mockResolvedValue({ data: { state: 'revoked' }, error: null }); expect((await handleReportAccess(request(), { action: 'download', token }, d)).status).toBe(410); expect(d.pdf).not.toHaveBeenCalled();
  });
  it('rejects at the exact 15-day boundary, not one millisecond after', () => {
    const row = { expires_at: '2026-12-05T13:27:00.000Z', revoked_at: null }; expect(reportAccessState(row, new Date('2026-12-05T13:26:59.999Z'))).toBe('active'); expect(reportAccessState(row, new Date('2026-12-05T13:27:00.000Z'))).toBe('expired'); expect(reportAccessState(row, new Date('2026-12-05T13:27:00.001Z'))).toBe('expired');
  });
  it('stops automated abuse before loading or returning reports', async () => {
    const d = deps(); d.abuseAllowed.mockResolvedValue(false); const r = await handleReportAccess(request(), { action: 'view', token: randomReportToken() }, d); expect(r.status).toBe(429); expect(d.db.rpc).not.toHaveBeenCalled();
  });
  it('puts secrets only in fragments, never organization parameters or server paths', () => {
    const token = randomReportToken(); const links = reportAccessLinks(token); for (const link of Object.values(links)) { const url = new URL(link); expect(url.hash).toBe(`#${token}`); expect(url.pathname).not.toContain(token); expect(url.search).toBe(''); expect(url.hostname).toBe('operixdispatch.com'); }
  });
  it('clears fragment immediately and stores nothing in local or session storage', () => {
    const token = randomReportToken(); window.history.replaceState(null, '', `/reportes/consulta?org=foreign#${token}`); const local = vi.spyOn(Storage.prototype, 'setItem'); expect(captureReportSecret()).toBe(token); expect(window.location.hash).toBe(''); expect(window.location.search).toBe(''); expect(local).not.toHaveBeenCalled();
  });
  it('sends secrets only in a no-store, no-referrer POST body with no user cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetchMock); const token = randomReportToken(); await requestReportAccess(token, 'view'); const [url, options] = fetchMock.mock.calls[0]; expect(url).not.toContain(token); expect(options).toMatchObject({ method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit' }); expect(JSON.parse(options.body)).toEqual({ token, action: 'view' });
  });
  it('does not activate Resend or perform any real send', async () => {
    const transport = vi.fn(); await expect(sendResend({ channel: 'reports', to: 'local@example.test', subject: 'local', html: '', eventKey: 'local' }, () => undefined, transport)).rejects.toThrow('desactivados'); expect(transport).not.toHaveBeenCalled();
  });
});