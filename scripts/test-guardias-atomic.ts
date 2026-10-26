/** Disposable local PostgreSQL only; no hosted credentials or real JWTs. */
import postgres from 'postgres';
import { strict as assert } from 'node:assert';
const db = postgres({ host: '/tmp/guardias-atomic/socket', port: 55441, database: 'atomic_validation', username: 'local_guard', max: 1 });
const u = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [org, company, otherCompany, root, issuer, corps, admin, volunteer] = [1,2,3,4,5,6,7,8].map(u);
const slot = { role: 'Dotación', mode: 'presencial', start: '2026-11-10T08:00:00Z', end: '2026-11-10T12:00:00Z', capacity: 2, critical: false, specialties: [] };
let passed = 0;
async function actor(tx: any, id: string) {
  await tx.unsafe('SET LOCAL ROLE authenticated');
  await tx`SELECT set_config('request.jwt.claim.sub',${id},true)`;
}
async function create(tx: any, c: string, slots: unknown) {
  const rows = await tx`SELECT public.guard_create_draft(${org}::uuid,${c}::uuid,'Atomic local','2026-11-10T08:00:00Z','2026-11-10T12:00:00Z','presencial',${tx.json(slots)}::jsonb) AS id`;
  return rows[0].id;
}
async function counts() {
  const [r] = await db`SELECT (SELECT count(*) FROM public.guard_shifts)::int shifts, (SELECT count(*) FROM public.guard_slots)::int slots, (SELECT count(*) FROM public.audit_log)::int audits, (SELECT count(*) FROM public.guard_audit_links)::int links`;
  return r;
}
async function rejected(label: string, who: string, c: string, slots: unknown, code: string) {
  const before = await counts();
  await assert.rejects(db.begin(async tx => { await actor(tx,who); await create(tx,c,slots); }), (e: any) => e.code === code);
  assert.deepEqual(await counts(),before);
  console.log('PASS',label,'— no shift, slot or audit delta'); passed++;
}
try {
  await db`INSERT INTO public.organizations VALUES(${org},'active')`;
  await db`INSERT INTO public.companies VALUES(${company},${org},true),(${otherCompany},${org},true)`;
  await db`INSERT INTO public.superadmins VALUES(${root})`;
  for (const [id,role,c] of [[issuer,'admin',null],[corps,'admin',null],[admin,'admin',company],[volunteer,'voluntario',company]]) {
    await db`INSERT INTO public.organization_members VALUES(${org},${id},'active',${role},${c})`;
  }
  // Existing delegation RPCs used as fixture setup, not counted as new tests.
  await db.begin(async tx => { await actor(tx,root); await tx`SELECT public.guard_set_issuer(${org},${issuer},true,'Fixture local')`; });
  await db.begin(async tx => { await actor(tx,issuer); await tx`SELECT public.guard_set_permission(${org},${company},${admin},'manage',true,'Fixture local')`; });
  const before = await counts();
  const sid = await db.begin(async tx => { await actor(tx,admin); return create(tx,company,[slot,{...slot,role:'Conductor'}]); });
  assert.deepEqual(await counts(),{ shifts:before.shifts+1, slots:before.slots+2, audits:before.audits+3, links:before.links+3 });
  const [scope] = await db`SELECT company_id,organization_id,created_by,status FROM public.guard_shifts WHERE id=${sid}`;
  assert.deepEqual(scope,{company_id:company,organization_id:org,created_by:admin,status:'borrador'});
  console.log('PASS complete draft: one shift, two slots, three audited events, derived actor'); passed++;
  await rejected('second slot invalid after first valid slot',admin,company,[slot,{...slot,capacity:0}],'P0001');
  await rejected('second slot timestamp cast fails',admin,company,[slot,{...slot,start:'not-a-date'}],'22007');
  await rejected('client actor field refused',admin,company,[slot,{...slot,created_by:issuer}],'22023');
  await rejected('empty batch',admin,company,[],'22023');
  await rejected('non-array batch',admin,company,{},'22023');
  await rejected('null specialty',admin,company,[slot,{...slot,specialties:[null]}],'22023');
  await rejected('company admin cannot create in other company',admin,otherCompany,[slot],'42501');
  await rejected('Corps supervision alone cannot create',corps,company,[slot],'42501');
  await rejected('issuer authority alone cannot create',issuer,company,[slot],'42501');
  await rejected('volunteer cannot create',volunteer,company,[slot],'42501');
  await db.unsafe(`CREATE FUNCTION public.local_atomic_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='GUARD_SLOT' THEN RAISE EXCEPTION 'local slot audit failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER local_atomic_audit_failure BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.local_atomic_audit_failure()`);
  await rejected('slot audit failure rolls back shift and its audit',admin,company,[slot],'P0001');
  await db.unsafe('DROP TRIGGER local_atomic_audit_failure ON public.audit_log; DROP FUNCTION public.local_atomic_audit_failure()');
  const [acl] = await db`SELECT p.prosecdef, has_function_privilege('authenticated',p.oid,'EXECUTE') allowed, has_function_privilege('anon',p.oid,'EXECUTE') anon, has_function_privilege('service_role',p.oid,'EXECUTE') service, has_function_privilege('sandbox_exec',p.oid,'EXECUTE') sandbox FROM pg_proc p WHERE p.oid='public.guard_create_draft(uuid,uuid,text,timestamptz,timestamptz,text,jsonb)'::regprocedure`;
  assert.deepEqual(acl,{prosecdef:false,allowed:true,anon:false,service:false,sandbox:false});
  console.log('PASS invoker wrapper and effective ACL'); passed++;
  console.log(`LOCAL_ATOMIC_PASS: ${passed} new checks; simulated identity, NOT real sessions`);
} finally { await db.end(); }