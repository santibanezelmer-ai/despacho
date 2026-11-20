/** Disposable local PostgreSQL ONLY: no hosted URLs, credentials or real users. */
import postgres from 'postgres';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
const db = postgres({ host: '/tmp/report-access-pg/socket', port: 55447, database: 'postgres', username: 'report_test', max: 4 });
const u = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [org, foreign, actor, recipient, limitedAdmin, snapshot] = [1,2,3,4,5,6].map(u);
let passed = 0;
const pass = (label: string) => { passed++; console.log('PASS', label); };
try {
  await db.unsafe(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; END IF; END$$; CREATE TABLE public.organizations(id uuid PRIMARY KEY,status text); CREATE TABLE public.profiles(user_id uuid PRIMARY KEY); CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,status text,role text,company_id uuid);`);
  await db.unsafe(await readFile('docs/prepared/monthly-report-access/migration.sql','utf8'));
  await db.unsafe('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role');
  await db`INSERT INTO organizations VALUES(${org},'active'),(${foreign},'active')`;
  await db`INSERT INTO profiles VALUES(${actor}),(${recipient}),(${limitedAdmin})`;
  await db`INSERT INTO organization_members VALUES(${org},${actor},'active','admin',NULL),(${org},${recipient},'active','oficial',NULL),(${org},${limitedAdmin},'active','admin',${u(99)})`;
  await db`INSERT INTO monthly_report_snapshots(id,organization_id,period,report) VALUES(${snapshot},${org},'2026-10',${db.json({organizationId:org,period:'2026-10',total:21})})`;
  const hash = 'a'.repeat(64);
  const [issue] = await db`SELECT monthly_report_issue(${org},${snapshot},${recipient},${hash},${actor}) AS r`;
  const id = issue.r.id;
  const [dates] = await db`SELECT (expires_at AT TIME ZONE 'America/Santiago') - (issued_at AT TIME ZONE 'America/Santiago') AS diff, expires_at >= issued_at AS valid FROM monthly_report_access_tokens WHERE id=${id}`;
  assert.equal(dates.diff,'15 days'); assert.equal(dates.valid,true); pass('exactly 15 Chile calendar days from server issuance');
  const [dst] = await db`SELECT ((('2026-08-30 10:00:00'::timestamp + interval '15 days') AT TIME ZONE 'America/Santiago') - ('2026-08-30 10:00:00'::timestamp AT TIME ZONE 'America/Santiago')) AS elapsed`;
  assert.equal(dst.elapsed,'14 days 23:00:00'); pass('calendar days preserve local hour across Chile DST');
  for (const action of ['view','download']) { const [r] = await db`SELECT monthly_report_consume(${hash},${action}) AS r`; assert.equal(r.r.state,'active'); assert.equal(r.r.report.organizationId,org); assert.equal(r.r.report.period,'2026-10'); }
  pass('valid view/download scoped to immutable report');
  const [audit] = await db`SELECT count(*)::int AS n FROM monthly_report_access_audit WHERE access_id=${id}`; assert.equal(audit.n,3); pass('issued, view and download audited without tokens');
  const [invalid] = await db`SELECT monthly_report_consume(${'b'.repeat(64)},'view') AS r`; assert.deepEqual(invalid.r,{state:'invalid'}); pass('nonexistent token rejected');
  await assert.rejects(db`SELECT monthly_report_issue(${foreign},${snapshot},${recipient},${'c'.repeat(64)},${actor})`, (e: any) => e.code === 'P0001'); pass('foreign organization issue rejected');
  await assert.rejects(db`SELECT monthly_report_issue(${org},${snapshot},${recipient},${'d'.repeat(64)},${limitedAdmin})`, (e: any) => e.code === 'P0001'); pass('company admin cannot grant organization-wide report');
  await assert.rejects(db`UPDATE monthly_report_access_tokens SET organization_id=${foreign} WHERE id=${id}`, (e: any) => e.code === 'P0001'); pass('token organization binding cannot change');
  const [revoked] = await db`SELECT monthly_report_revoke(${org},${id},${actor}) AS r`; assert.equal(revoked.r,true);
  const [blocked] = await db`SELECT monthly_report_consume(${hash},'download') AS r`; assert.deepEqual(blocked.r,{state:'revoked'}); pass('revocation immediately blocks downloads');
  const [history] = await db`SELECT count(*)::int AS n FROM monthly_report_snapshots`; assert.equal(history.n,1); pass('revocation preserves report history');
  const [expires] = await db`SELECT monthly_report_issue(${org},${snapshot},${recipient},${'e'.repeat(64)},${actor}) AS r`;
  // Fixture-only time travel; real trigger is enabled again before verification.
  await db.unsafe('ALTER TABLE monthly_report_access_tokens DISABLE TRIGGER monthly_report_token_dates');
  await db`UPDATE monthly_report_access_tokens SET expires_at=clock_timestamp() - interval '1 second' WHERE id=${expires.r.id}`;
  await db.unsafe('ALTER TABLE monthly_report_access_tokens ENABLE TRIGGER monthly_report_token_dates');
  for (const action of ['view','download']) { const [r] = await db`SELECT monthly_report_consume(${'e'.repeat(64)},${action}) AS r`; assert.deepEqual(r.r,{state:'expired'}); } pass('expired token blocks both actions');
  for (const role of ['anon','authenticated']) { await assert.rejects(db.begin(async tx => { await tx.unsafe(`SET LOCAL ROLE ${role}`); await tx`SELECT * FROM monthly_report_access_tokens`; }), (e: any) => e.code === '42501'); } pass('anonymous and signed-in direct table reads forbidden');
  const origin = 'f'.repeat(64), link = '1'.repeat(64);
  const results = await Promise.all(Array.from({length:11}, () => db`SELECT monthly_report_rate_gate(${origin},${link}) AS allowed`));
  assert.equal(results.filter(r => r[0].allowed).length,10); pass('concurrent limit: only 10 requests per link per minute');
  const [limit] = await db`SELECT blocked_until - window_at AS duration FROM monthly_report_access_limits WHERE key_hash=${'link:'+link}`; assert.ok(limit.duration.startsWith('00:10:')); pass('10-minute temporary abuse block');
  const raw = await db`SELECT column_name FROM information_schema.columns WHERE table_name='monthly_report_access_tokens'`; assert.equal(raw.some(c => c.column_name === 'token'),false); pass('no raw-token column');
  console.log(`LOCAL_REPORT_ACCESS_PASS: ${passed}; disposable fixtures only, no production change`);
} finally { await db.end(); }