import { createMonthlyReportPdf } from './functions/_shared/report-pdf.ts';
import { reportLogo } from './functions/_shared/report-logo.ts';
import { summarize } from './functions/_shared/monthly-report.ts';
Deno.test('private server PDF preserves report period and existing executive design', () => {
  const m = summarize([]);
  const report = { organizationId: 'local-only', organizationName: 'Organización de prueba local', period: '2026-10', priorPeriod: '2026-09', generatedAt: '2026-11-20T13:00:00Z', current: m, prior: m, keys: {}, companies: {}, vehicles: {} };
  const pdf = createMonthlyReportPdf(report, reportLogo);
  if (pdf.getNumberOfPages() !== 2 || pdf.output('arraybuffer').byteLength < 1000 || !pdf.output().includes('2026-10')) throw new Error('Invalid PDF');
  if (Deno.permissions.querySync({ name: 'write', path: '/tmp/report-access-pg/preview.pdf' }).state === 'granted') Deno.writeFileSync('/tmp/report-access-pg/preview.pdf', new Uint8Array(pdf.output('arraybuffer')));
});