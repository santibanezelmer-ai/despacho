-- V3 CANDIDATE REVIEW ONLY; v2 preserved in v2-original.zip. Apply 01+02+03 as ONE transaction after explicit approval.
-- sandbox_exec exists in the inspected destination. Re-check before applying elsewhere.
-- No data operations, no runtime app edits, no auth.users foreign keys.
-- Run migration in one transaction through the authorized migration tool.
CREATE UNIQUE INDEX guard_companies_id_org ON public.companies(id,organization_id);
CREATE UNIQUE INDEX guard_volunteers_id_org ON public.volunteers(id,organization_id);

-- Helpers use the current authenticated identity, never a supplied actor.
CREATE FUNCTION public.guard_member(_org uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.organization_members m
 JOIN public.organizations o ON o.id=m.organization_id
 WHERE m.organization_id=_org AND m.user_id=auth.uid() AND m.status='active' AND o.status='active')
$$;
REVOKE ALL ON FUNCTION public.guard_member(uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_member(uuid) TO authenticated,service_role;

CREATE FUNCTION public.guard_supervise(_org uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.guard_member(_org) AND EXISTS(SELECT 1 FROM public.organization_members m
 WHERE m.organization_id=_org AND m.user_id=auth.uid() AND m.status='active'
 AND m.role='admin' AND m.company_id IS NULL)
$$;
REVOKE ALL ON FUNCTION public.guard_supervise(uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_supervise(uuid) TO authenticated,service_role;
CREATE TABLE public.guard_permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 user_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('manage','validate_attendance')),
 granted_by uuid NOT NULL, reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 revoked_at timestamptz, revoked_by uuid,
 CHECK((revoked_at IS NULL)=(revoked_by IS NULL)),
 CHECK(action <> 'manage' OR granted_by <> user_id)
);
REVOKE ALL ON public.guard_permissions FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_permissions TO service_role;
ALTER TABLE public.guard_permissions ENABLE ROW LEVEL SECURITY;
-- No client policies: internal storage, default deny.

CREATE UNIQUE INDEX guard_permission_current ON public.guard_permissions(organization_id,company_id,user_id,action) WHERE revoked_at IS NULL;
CREATE FUNCTION public.guard_can(_org uuid,_company uuid,_action text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.guard_member(_org) AND EXISTS(SELECT 1 FROM public.companies c WHERE c.id=_company AND c.organization_id=_org AND c.active)
 AND EXISTS(SELECT 1 FROM public.guard_permissions p JOIN public.organization_members m
 ON m.organization_id=p.organization_id AND m.user_id=p.user_id
 WHERE p.organization_id=_org AND p.company_id=_company AND p.user_id=auth.uid() AND p.action=_action
 AND p.revoked_at IS NULL AND p.granted_by<>p.user_id AND m.status='active'
 AND ((m.role='admin' AND (m.company_id IS NULL OR m.company_id=_company) AND _action='manage')
 OR (m.role='oficial' AND (m.company_id IS NULL OR m.company_id=_company) AND _action='validate_attendance')))

$$;
REVOKE ALL ON FUNCTION public.guard_can(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_can(uuid,uuid,text) TO authenticated,service_role;

CREATE FUNCTION public.guard_self(_org uuid,_vol uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.guard_member(_org) AND EXISTS(SELECT 1 FROM public.volunteers v
 WHERE v.id=_vol AND v.organization_id=_org AND v.user_id=auth.uid())
$$;
REVOKE ALL ON FUNCTION public.guard_self(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_self(uuid,uuid) TO authenticated,service_role;
CREATE TABLE public.guard_shifts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 mode text NOT NULL CHECK(mode IN ('presencial','domiciliaria','mixta')),
 status text NOT NULL DEFAULT 'borrador' CHECK(status IN ('borrador','publicado','en_curso','finalizado','cancelado')),
 reason text, created_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(isfinite(starts_at) AND isfinite(ends_at) AND ends_at>starts_at), UNIQUE(id,organization_id,company_id)
);
REVOKE ALL ON public.guard_shifts FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_shifts TO service_role;
GRANT SELECT ON public.guard_shifts TO authenticated;
ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_shifts_read ON public.guard_shifts FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE TABLE public.guard_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 shift_id uuid NOT NULL, role_name text NOT NULL CHECK(length(btrim(role_name)) BETWEEN 1 AND 100),
 mode text NOT NULL CHECK(mode IN ('presencial','domiciliaria')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 500),
 critical boolean NOT NULL DEFAULT false, open_applications boolean NOT NULL DEFAULT false,
 required_specialties text[] NOT NULL DEFAULT '{}',
 CHECK(isfinite(starts_at) AND isfinite(ends_at) AND ends_at>starts_at), UNIQUE(id,shift_id,organization_id,company_id),
 FOREIGN KEY(shift_id,organization_id,company_id) REFERENCES public.guard_shifts(id,organization_id,company_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_slots FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_slots TO service_role;
GRANT SELECT ON public.guard_slots TO authenticated;
ALTER TABLE public.guard_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_slots_read ON public.guard_slots FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE TABLE public.guard_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 shift_id uuid NOT NULL, slot_id uuid NOT NULL, volunteer_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'propuesto' CHECK(status IN ('propuesto','confirmado','rechazado','retirado','reemplazado')),
 created_by uuid NOT NULL, decided_at timestamptz, reason text,
 CHECK(isfinite(starts_at) AND isfinite(ends_at) AND ends_at>starts_at), UNIQUE(id,shift_id,organization_id,company_id),
 FOREIGN KEY(slot_id,shift_id,organization_id,company_id) REFERENCES public.guard_slots(id,shift_id,organization_id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(volunteer_id,organization_id) REFERENCES public.volunteers(id,organization_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_assignments FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_assignments TO service_role;
GRANT SELECT ON public.guard_assignments TO authenticated;
ALTER TABLE public.guard_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_assignments_read ON public.guard_assignments FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE UNIQUE INDEX guard_assignment_active ON public.guard_assignments(shift_id,volunteer_id) WHERE status IN ('propuesto','confirmado');
-- Phase 1 reads expose personal shifts/slots only by an assignment, not company-wide rosters.
CREATE FUNCTION public.guard_own_shift(_org uuid,_shift uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.guard_member(_org) AND EXISTS(SELECT 1 FROM public.guard_assignments a
 JOIN public.volunteers v ON v.id=a.volunteer_id AND v.organization_id=a.organization_id
 WHERE a.organization_id=_org AND a.shift_id=_shift AND v.user_id=auth.uid())
$$;
REVOKE ALL ON FUNCTION public.guard_own_shift(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_own_shift(uuid,uuid) TO authenticated,service_role;
CREATE TABLE public.guard_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 shift_id uuid NOT NULL, slot_id uuid NOT NULL, volunteer_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','aprobada','rechazada','retirada')),
 decided_by uuid, decided_at timestamptz, reason text,
 FOREIGN KEY(slot_id,shift_id,organization_id,company_id) REFERENCES public.guard_slots(id,shift_id,organization_id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(volunteer_id,organization_id) REFERENCES public.volunteers(id,organization_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_applications FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_applications TO service_role;
GRANT SELECT ON public.guard_applications TO authenticated;
ALTER TABLE public.guard_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_applications_read ON public.guard_applications FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE UNIQUE INDEX guard_application_pending ON public.guard_applications(slot_id,volunteer_id) WHERE status='pendiente';
CREATE TABLE public.guard_swap_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 shift_id uuid NOT NULL, assignment_id uuid NOT NULL, original_volunteer_id uuid NOT NULL,
 replacement_volunteer_id uuid NOT NULL, counterpart_assignment_id uuid REFERENCES public.guard_assignments(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'solicitada' CHECK(status IN ('solicitada','aceptada','aprobada','rechazada','cancelada')),
 accepted_at timestamptz, decided_at timestamptz, decided_by uuid, reason text,
 CHECK(original_volunteer_id<>replacement_volunteer_id),
 FOREIGN KEY(assignment_id,shift_id,organization_id,company_id) REFERENCES public.guard_assignments(id,shift_id,organization_id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(original_volunteer_id,organization_id) REFERENCES public.volunteers(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(replacement_volunteer_id,organization_id) REFERENCES public.volunteers(id,organization_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_swap_requests FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_swap_requests TO service_role;
GRANT SELECT ON public.guard_swap_requests TO authenticated;
ALTER TABLE public.guard_swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_swap_requests_read ON public.guard_swap_requests FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE UNIQUE INDEX guard_swap_pending ON public.guard_swap_requests(assignment_id) WHERE status IN ('solicitada','aceptada');
CREATE TABLE public.guard_attendance_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 shift_id uuid NOT NULL, assignment_id uuid NOT NULL, volunteer_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('llegada','salida','validacion','observacion','correccion')),
 occurred_at timestamptz NOT NULL, actor_id uuid NOT NULL,
 previous_event_id uuid, decision text CHECK(decision IN ('validada','observada')),
 reason text, UNIQUE(id,assignment_id,shift_id,organization_id,company_id),
 CHECK(kind IN ('llegada','salida') OR (previous_event_id IS NOT NULL AND reason IS NOT NULL AND length(btrim(reason)) BETWEEN 3 AND 1000)),
 FOREIGN KEY(assignment_id,shift_id,organization_id,company_id) REFERENCES public.guard_assignments(id,shift_id,organization_id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(volunteer_id,organization_id) REFERENCES public.volunteers(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(previous_event_id,assignment_id,shift_id,organization_id,company_id) REFERENCES public.guard_attendance_events(id,assignment_id,shift_id,organization_id,company_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_attendance_events FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_attendance_events TO service_role;
GRANT SELECT ON public.guard_attendance_events TO authenticated;
ALTER TABLE public.guard_attendance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_attendance_events_read ON public.guard_attendance_events FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage') OR public.guard_can(organization_id,company_id,'validate_attendance'));

CREATE TABLE public.company_guard_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 role_name text NOT NULL CHECK(length(btrim(role_name)) BETWEEN 1 AND 100),
 mode text NOT NULL CHECK(mode IN ('presencial','domiciliaria')),
 minimum integer NOT NULL CHECK(minimum BETWEEN 0 AND 500),
 required_specialties text[] NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true
);
REVOKE ALL ON public.company_guard_rules FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.company_guard_rules TO service_role;
GRANT SELECT ON public.company_guard_rules TO authenticated;
ALTER TABLE public.company_guard_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_guard_rules_read ON public.company_guard_rules FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE TABLE public.guard_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 specification jsonb NOT NULL CHECK(jsonb_typeof(specification)='object'),
 created_by uuid NOT NULL, archived_at timestamptz
);
REVOKE ALL ON public.guard_templates FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_templates TO service_role;
GRANT SELECT ON public.guard_templates TO authenticated;
ALTER TABLE public.guard_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY guard_templates_read ON public.guard_templates FOR SELECT TO authenticated USING (public.guard_supervise(organization_id) OR public.guard_can(organization_id,company_id,'manage'));

CREATE TABLE public.guard_notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 event_key text NOT NULL, recipient_id uuid NOT NULL,
 shift_id uuid NOT NULL, payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), next_attempt_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_key,recipient_id),
 FOREIGN KEY(shift_id,organization_id,company_id) REFERENCES public.guard_shifts(id,organization_id,company_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_notification_outbox FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_notification_outbox TO service_role;
ALTER TABLE public.guard_notification_outbox ENABLE ROW LEVEL SECURITY;
-- No client policies: internal storage, default deny.

CREATE TABLE public.guard_audit_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 company_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,organization_id) REFERENCES public.companies(id,organization_id) ON DELETE RESTRICT,
 CHECK(shift_id IS NULL OR company_id IS NOT NULL),
 audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_log(id) ON DELETE RESTRICT,
 shift_id uuid, event_name text NOT NULL, summary jsonb NOT NULL CHECK(jsonb_typeof(summary)='object'),
 FOREIGN KEY(shift_id,organization_id,company_id) REFERENCES public.guard_shifts(id,organization_id,company_id) ON DELETE RESTRICT
);
REVOKE ALL ON public.guard_audit_links FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT SELECT ON public.guard_audit_links TO service_role;
ALTER TABLE public.guard_audit_links ENABLE ROW LEVEL SECURITY;
-- No client policies: internal storage, default deny.

-- Supporting indexes, no universal staffing defaults.
CREATE INDEX guard_shift_calendar ON public.guard_shifts(organization_id,company_id,starts_at,status);
CREATE INDEX guard_slot_shift ON public.guard_slots(organization_id,company_id,shift_id);
CREATE INDEX guard_assignment_person ON public.guard_assignments(volunteer_id,starts_at,ends_at) WHERE status IN ('propuesto','confirmado');
CREATE INDEX guard_assignment_capacity ON public.guard_assignments(slot_id,status);
CREATE INDEX guard_application_queue ON public.guard_applications(organization_id,company_id,status,slot_id);
CREATE INDEX guard_swap_queue ON public.guard_swap_requests(organization_id,company_id,status);
CREATE INDEX guard_attendance_history ON public.guard_attendance_events(assignment_id,occurred_at);
CREATE INDEX guard_rules_company ON public.company_guard_rules(organization_id,company_id,active);
CREATE INDEX guard_templates_company ON public.guard_templates(organization_id,company_id,archived_at);
CREATE INDEX guard_outbox_retry ON public.guard_notification_outbox(status,next_attempt_at);
CREATE INDEX guard_audit_scope ON public.guard_audit_links(organization_id,company_id,shift_id,created_at);

-- All later-phase tables are storage only: NO mutation RPCs until separately reviewed.
-- Fixed helpers owned by the migration owner deliberately bypass RLS to avoid recursion.
-- Authenticated cannot CREATE in public (verified in live catalog); re-check before application.

-- Issuer authority is never inferred from mutable organization memberships.
CREATE TABLE public.guard_permission_issuers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL, authorized_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 revoked_at timestamptz, revoked_by uuid, CHECK((revoked_at IS NULL)=(revoked_by IS NULL)),
 CHECK(user_id<>authorized_by)
);
REVOKE ALL ON public.guard_permission_issuers FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT SELECT ON public.guard_permission_issuers TO service_role;
ALTER TABLE public.guard_permission_issuers ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX guard_issuer_current ON public.guard_permission_issuers(organization_id,user_id) WHERE revoked_at IS NULL;
CREATE FUNCTION public.guard_is_issuer(_org uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.guard_supervise(_org) AND EXISTS(SELECT 1 FROM public.guard_permission_issuers
 WHERE organization_id=_org AND user_id=auth.uid() AND revoked_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.guard_is_issuer(uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;

ALTER TABLE public.guard_shifts ADD COLUMN replaces_shift_id uuid;
ALTER TABLE public.guard_shifts ADD CONSTRAINT guard_replacement_scope FOREIGN KEY(replaces_shift_id,organization_id,company_id) REFERENCES public.guard_shifts(id,organization_id,company_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX guard_one_replacement ON public.guard_shifts(replaces_shift_id) WHERE replaces_shift_id IS NOT NULL;
ALTER TABLE public.guard_shifts ADD CONSTRAINT guard_no_self_replacement CHECK(replaces_shift_id IS DISTINCT FROM id);
-- REVIEW ONLY: RPC command surface. Every successful write audits in same transaction.
-- All writes serialize per organization. Person locks also serialize across companies/orgs.
CREATE FUNCTION public.guard_lock(_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'guard commands require read committed; retry otherwise' USING ERRCODE='40001';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('guard-org:'||_org::text,0));
 IF NOT public.guard_member(_org) THEN RAISE EXCEPTION 'organization denied' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.guard_lock(uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;

CREATE FUNCTION public.guard_record(_org uuid,_company uuid,_shift uuid,_event text,_old jsonb,_new jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE aid uuid; entity_id uuid; entity_table text; before_doc jsonb; after_doc jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.guard_member(_org) OR public.is_superadmin()) THEN RAISE EXCEPTION 'audit denied' USING ERRCODE='42501'; END IF;
 IF (_company IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.companies WHERE id=_company AND organization_id=_org)) OR
 (_shift IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.guard_shifts WHERE id=_shift AND organization_id=_org AND company_id=_company)) THEN RAISE EXCEPTION 'audit scope denied'; END IF;
 CASE _event
 WHEN 'GUARD_ISSUER' THEN entity_table := 'guard_permission_issuers'; entity_id := (_new->>'issuer_id')::uuid;
 WHEN 'GUARD_PERMISSION' THEN entity_table := 'guard_permissions'; entity_id := (_new->>'permission_id')::uuid;
 WHEN 'GUARD_SLOT' THEN entity_table := 'guard_slots'; entity_id := (_new->>'slot')::uuid;
 WHEN 'GUARD_ASSIGN' THEN entity_table := 'guard_assignments'; entity_id := (_new->>'assignment')::uuid;
 WHEN 'GUARD_CONFIRM' THEN entity_table := 'guard_assignments'; entity_id := (_old->>'id')::uuid;
 WHEN 'GUARD_CREATE','GUARD_EDIT','GUARD_TRANSITION' THEN entity_table := 'guard_shifts'; entity_id := _shift;
 ELSE RAISE EXCEPTION 'invalid audit event'; END CASE;
 IF entity_id IS NULL THEN RAISE EXCEPTION 'audit entity required'; END IF;
 -- Identifier is exclusively selected by the closed CASE above, never supplied by caller.
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND organization_id=$2'||CASE WHEN entity_table='guard_permission_issuers' THEN '' ELSE ' AND company_id=$3' END,entity_table)
 INTO after_doc USING entity_id,_org,_company;
 IF after_doc IS NULL THEN RAISE EXCEPTION 'audit entity unavailable'; END IF;
 before_doc := _old;
 INSERT INTO public.audit_log(organization_id,user_id,action,table_name,record_id,old_data,new_data)
 VALUES(_org,auth.uid(),_event,entity_table,entity_id,before_doc,jsonb_build_object('entity_after',after_doc,'operation',_new)) RETURNING id INTO aid;
 IF aid IS NULL OR NOT EXISTS(SELECT 1 FROM public.audit_log x WHERE x.id=aid AND x.organization_id=_org
 AND x.user_id=auth.uid() AND x.action=_event AND x.table_name=entity_table AND x.record_id=entity_id) THEN
 RAISE EXCEPTION 'audit contract mismatch'; END IF;
 INSERT INTO public.guard_audit_links(organization_id,company_id,shift_id,audit_id,event_name,summary)
 VALUES(_org,_company,_shift,aid,_event,jsonb_build_object('event',_event));
END $$;
REVOKE ALL ON FUNCTION public.guard_record(uuid,uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;

CREATE FUNCTION public.guard_manage_required(_org uuid,_company uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT public.guard_can(_org,_company,'manage') THEN RAISE EXCEPTION 'company management denied' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.guard_manage_required(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;

CREATE FUNCTION public.guard_set_permission(_org uuid,_company uuid,_target uuid,_action text,_grant boolean,_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE pid uuid; oldrow jsonb;
BEGIN
 PERFORM public.guard_lock(_org);
 IF NOT public.guard_is_issuer(_org) THEN RAISE EXCEPTION 'delegation denied' USING ERRCODE='42501'; END IF;
 IF _action IS NULL OR _action NOT IN ('manage','validate_attendance') OR _grant IS NULL OR _reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'invalid delegation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=_company AND organization_id=_org) THEN RAISE EXCEPTION 'invalid company'; END IF;
 IF _grant AND NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=_org AND m.user_id=_target AND m.status='active'
 AND ((_action='manage' AND m.role='admin' AND (m.company_id IS NULL OR m.company_id=_company))
 OR (_action='validate_attendance' AND m.role='oficial' AND (m.company_id IS NULL OR m.company_id=_company)))) THEN RAISE EXCEPTION 'invalid permission target'; END IF;
 SELECT id,to_jsonb(p) INTO pid,oldrow FROM public.guard_permissions p WHERE organization_id=_org AND company_id=_company AND user_id=_target AND action=_action AND revoked_at IS NULL FOR UPDATE;
 IF _grant THEN
  IF _target=auth.uid() THEN RAISE EXCEPTION 'another administrator must authorize management' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=_company AND active) THEN RAISE EXCEPTION 'inactive company'; END IF;
  IF pid IS NOT NULL THEN RAISE EXCEPTION 'already granted'; END IF;
  INSERT INTO public.guard_permissions(organization_id,company_id,user_id,action,granted_by,reason)
  VALUES(_org,_company,_target,_action,auth.uid(),btrim(_reason)) RETURNING id INTO pid;
 ELSE
  IF pid IS NULL THEN RAISE EXCEPTION 'no active permission'; END IF;
  UPDATE public.guard_permissions SET revoked_at=now(),revoked_by=auth.uid() WHERE id=pid;
 END IF;
 PERFORM public.guard_record(_org,_company,NULL,'GUARD_PERMISSION',oldrow,jsonb_build_object('permission_id',pid,'grant',_grant,'action',_action,'reason',btrim(_reason)));
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.guard_set_permission(uuid,uuid,uuid,text,boolean,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_set_permission(uuid,uuid,uuid,text,boolean,text) TO authenticated;

CREATE FUNCTION public.guard_create_shift(_org uuid,_company uuid,_name text,_start timestamptz,_end timestamptz,_mode text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE sid uuid; rowdata jsonb;
BEGIN
 PERFORM public.guard_lock(_org); PERFORM public.guard_manage_required(_org,_company);
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 1 AND 160 OR _start IS NULL OR _end IS NULL OR _end<=_start OR NOT isfinite(_start) OR NOT isfinite(_end) OR _mode IS NULL OR _mode NOT IN ('presencial','domiciliaria','mixta') THEN RAISE EXCEPTION 'invalid shift'; END IF;
 INSERT INTO public.guard_shifts(organization_id,company_id,name,starts_at,ends_at,mode,created_by)
 VALUES(_org,_company,btrim(_name),_start,_end,_mode,auth.uid()) RETURNING id,to_jsonb(guard_shifts.*) INTO sid,rowdata;
 PERFORM public.guard_record(_org,_company,sid,'GUARD_CREATE',NULL,rowdata); RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.guard_create_shift(uuid,uuid,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_create_shift(uuid,uuid,text,timestamptz,timestamptz,text) TO authenticated;

CREATE FUNCTION public.guard_edit_shift(_org uuid,_shift uuid,_name text,_start timestamptz,_end timestamptz,_mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.guard_shifts;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO s FROM public.guard_shifts WHERE id=_shift AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'shift unavailable'; END IF;
 PERFORM public.guard_manage_required(_org,s.company_id);
 IF s.status<>'borrador' OR EXISTS(SELECT 1 FROM public.guard_slots WHERE shift_id=s.id) THEN RAISE EXCEPTION 'only empty draft schedule editable'; END IF;
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 1 AND 160 OR _start IS NULL OR _end IS NULL OR _end<=_start OR NOT isfinite(_start) OR NOT isfinite(_end) OR _mode IS NULL OR _mode NOT IN ('presencial','domiciliaria','mixta') THEN RAISE EXCEPTION 'invalid shift'; END IF;
 UPDATE public.guard_shifts SET name=btrim(_name),starts_at=_start,ends_at=_end,mode=_mode,updated_at=now() WHERE id=s.id;
 PERFORM public.guard_record(_org,s.company_id,s.id,'GUARD_EDIT',to_jsonb(s),jsonb_build_object('name',btrim(_name),'start',_start,'end',_end,'mode',_mode));
END $$;
REVOKE ALL ON FUNCTION public.guard_edit_shift(uuid,uuid,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_edit_shift(uuid,uuid,text,timestamptz,timestamptz,text) TO authenticated;

CREATE FUNCTION public.guard_create_slot(_org uuid,_shift uuid,_role text,_mode text,_start timestamptz,_end timestamptz,_capacity integer,_critical boolean,_specialties text[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.guard_shifts; sid uuid;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO s FROM public.guard_shifts WHERE id=_shift AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'shift unavailable'; END IF;
 PERFORM public.guard_manage_required(_org,s.company_id);
 IF s.status<>'borrador' THEN RAISE EXCEPTION 'draft required'; END IF;
 IF _role IS NULL OR length(btrim(_role)) NOT BETWEEN 1 AND 100 OR _mode IS NULL OR _mode NOT IN ('presencial','domiciliaria') OR (s.mode<>'mixta' AND s.mode<>_mode) OR _start IS NULL OR _end IS NULL OR _end<=_start OR _start<s.starts_at OR _end>s.ends_at OR _capacity IS NULL OR _capacity NOT BETWEEN 1 AND 500 OR _critical IS NULL OR _specialties IS NULL OR cardinality(_specialties)>50 OR EXISTS(SELECT 1 FROM unnest(_specialties) x WHERE x IS NULL OR length(btrim(x)) NOT BETWEEN 1 AND 100) THEN RAISE EXCEPTION 'invalid slot'; END IF;
 INSERT INTO public.guard_slots(organization_id,company_id,shift_id,role_name,mode,starts_at,ends_at,capacity,critical,required_specialties)
 VALUES(_org,s.company_id,s.id,btrim(_role),_mode,_start,_end,_capacity,_critical,_specialties) RETURNING id INTO sid;
 PERFORM public.guard_record(_org,s.company_id,s.id,'GUARD_SLOT',NULL,jsonb_build_object('slot',sid)); RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.guard_create_slot(uuid,uuid,text,text,timestamptz,timestamptz,integer,boolean,text[]) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_create_slot(uuid,uuid,text,text,timestamptz,timestamptz,integer,boolean,text[]) TO authenticated;

CREATE FUNCTION public.guard_transition(_org uuid,_shift uuid,_expected text,_next text,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.guard_shifts; affected jsonb;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO s FROM public.guard_shifts WHERE id=_shift AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'shift unavailable'; END IF;
 PERFORM public.guard_manage_required(_org,s.company_id);
 IF _expected IS NULL OR s.status<>_expected OR _next IS NULL OR NOT ((s.status='borrador' AND _next IN ('publicado','cancelado')) OR (s.status='publicado' AND _next IN ('en_curso','cancelado')) OR (s.status='en_curso' AND _next IN ('finalizado','cancelado'))) THEN RAISE EXCEPTION 'invalid or stale transition'; END IF;
 IF _next='cancelado' AND (_reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 3 AND 1000) THEN RAISE EXCEPTION 'cancellation reason required'; END IF;
 IF _next='publicado' AND NOT EXISTS(SELECT 1 FROM public.guard_slots WHERE shift_id=s.id) THEN RAISE EXCEPTION 'slots required'; END IF;
 IF _next='en_curso' AND (now()<s.starts_at OR now()>=s.ends_at) THEN RAISE EXCEPTION 'outside shift period'; END IF;
 UPDATE public.guard_shifts SET status=_next,reason=CASE WHEN _next='cancelado' THEN btrim(_reason) ELSE reason END,updated_at=now() WHERE id=s.id;
 IF _next='cancelado' THEN SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) INTO affected FROM public.guard_assignments a WHERE shift_id=s.id AND status IN ('propuesto','confirmado'); UPDATE public.guard_assignments SET status='retirado',decided_at=now(),reason=btrim(_reason) WHERE shift_id=s.id AND status IN ('propuesto','confirmado'); END IF;
 PERFORM public.guard_record(_org,s.company_id,s.id,'GUARD_TRANSITION',to_jsonb(s),jsonb_build_object('state',_next,'reason',_reason,'withdrawn_assignments_before',affected));
END $$;
REVOKE ALL ON FUNCTION public.guard_transition(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_transition(uuid,uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.guard_assign(_org uuid,_slot uuid,_volunteer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE p public.guard_slots; s public.guard_shifts; v public.volunteers; aid uuid;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO p FROM public.guard_slots WHERE id=_slot AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'slot unavailable'; END IF;
 PERFORM public.guard_manage_required(_org,p.company_id);
 SELECT * INTO s FROM public.guard_shifts WHERE id=p.shift_id FOR UPDATE;
 IF s.status NOT IN ('borrador','publicado') OR p.ends_at<=now() THEN RAISE EXCEPTION 'shift closed'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('guard-person:'||_volunteer::text,0));
 SELECT * INTO v FROM public.volunteers WHERE id=_volunteer AND organization_id=_org FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'volunteer unavailable'; END IF;
 IF v.company_id IS DISTINCT FROM p.company_id OR v.status IS DISTINCT FROM 'activo' OR (p.required_specialties<@coalesce(v.specialties,'{}')) IS NOT TRUE THEN RAISE EXCEPTION 'volunteer ineligible'; END IF;
 IF (SELECT count(*) FROM public.guard_assignments WHERE slot_id=p.id AND status IN ('propuesto','confirmado'))>=p.capacity THEN RAISE EXCEPTION 'slot full' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.guard_assignments a JOIN public.guard_shifts gs ON gs.id=a.shift_id WHERE a.volunteer_id=v.id AND a.status IN ('propuesto','confirmado') AND gs.status<>'cancelado' AND a.starts_at<p.ends_at AND p.starts_at<a.ends_at) THEN RAISE EXCEPTION 'schedule conflict' USING ERRCODE='23514'; END IF;
 INSERT INTO public.guard_assignments(organization_id,company_id,shift_id,slot_id,volunteer_id,starts_at,ends_at,created_by)
 VALUES(_org,p.company_id,p.shift_id,p.id,v.id,p.starts_at,p.ends_at,auth.uid()) RETURNING id INTO aid;
 PERFORM public.guard_record(_org,p.company_id,p.shift_id,'GUARD_ASSIGN',NULL,jsonb_build_object('assignment',aid,'volunteer',v.id)); RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.guard_assign(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_assign(uuid,uuid,uuid) TO authenticated;

CREATE FUNCTION public.guard_confirm(_org uuid,_assignment uuid,_accept boolean,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.guard_assignments; s public.guard_shifts; p public.guard_slots; v public.volunteers;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO a FROM public.guard_assignments WHERE id=_assignment AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'assignment unavailable'; END IF;
 IF NOT public.guard_self(_org,a.volunteer_id) THEN RAISE EXCEPTION 'self confirmation only' USING ERRCODE='42501'; END IF;
 IF _accept IS NULL OR a.status<>'propuesto' THEN RAISE EXCEPTION 'invalid or stale response'; END IF;
 SELECT * INTO s FROM public.guard_shifts WHERE id=a.shift_id;
 IF s.status<>'publicado' OR a.ends_at<=now() THEN RAISE EXCEPTION 'shift not open'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('guard-person:'||a.volunteer_id::text,0));
 SELECT * INTO v FROM public.volunteers WHERE id=a.volunteer_id FOR SHARE;
 SELECT * INTO p FROM public.guard_slots WHERE id=a.slot_id;
 IF _accept AND (v.status IS DISTINCT FROM 'activo' OR v.company_id IS DISTINCT FROM a.company_id OR (p.required_specialties<@coalesce(v.specialties,'{}')) IS NOT TRUE) THEN RAISE EXCEPTION 'volunteer ineligible'; END IF;
 IF NOT _accept AND (_reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 3 AND 1000) THEN RAISE EXCEPTION 'rejection reason required'; END IF;
 UPDATE public.guard_assignments SET status=CASE WHEN _accept THEN 'confirmado' ELSE 'rechazado' END,decided_at=now(),reason=CASE WHEN _accept THEN NULL ELSE btrim(_reason) END WHERE id=a.id;
 PERFORM public.guard_record(_org,a.company_id,a.shift_id,'GUARD_CONFIRM',to_jsonb(a),jsonb_build_object('accepted',_accept,'reason',_reason));
END $$;
REVOKE ALL ON FUNCTION public.guard_confirm(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_confirm(uuid,uuid,boolean,text) TO authenticated;

CREATE FUNCTION public.guard_history(_org uuid,_company uuid,_shift uuid DEFAULT NULL) RETURNS TABLE(event_name text,happened_at timestamptz,summary jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.guard_supervise(_org) OR public.guard_can(_org,_company,'manage')) THEN RAISE EXCEPTION 'history denied' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=_company AND organization_id=_org) THEN RAISE EXCEPTION 'company unavailable'; END IF;
 IF _shift IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.guard_shifts WHERE id=_shift AND organization_id=_org AND company_id=_company) THEN RAISE EXCEPTION 'shift unavailable'; END IF;
 RETURN QUERY SELECT l.event_name,l.created_at,l.summary FROM public.guard_audit_links l
 WHERE l.organization_id=_org AND l.company_id=_company AND (_shift IS NULL OR l.shift_id=_shift) ORDER BY l.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.guard_history(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_history(uuid,uuid,uuid) TO authenticated;

-- No guard RPC accepts created_by/user_id/audit actor from the caller.
-- Target UUID in delegation and volunteer UUID in assignment are subjects, NOT actors.
-- No RPC to approve applications, swaps or attendance is exposed in Phase 1.
-- No direct DML for anon, authenticated or service_role. Never expose service credentials.

-- Redacted personal projection; no management actor IDs, internal notes or other participants.
CREATE FUNCTION public.guard_my_assignments(_org uuid)
RETURNS TABLE(assignment_id uuid,shift_id uuid,slot_id uuid,company_id uuid,shift_name text,starts_at timestamptz,ends_at timestamptz,mode text,role_name text,assignment_status text,shift_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT public.guard_member(_org) THEN RAISE EXCEPTION 'organization denied' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT a.id,s.id,p.id,a.company_id,s.name,a.starts_at,a.ends_at,p.mode,p.role_name,a.status,s.status
 FROM public.guard_assignments a JOIN public.volunteers v ON v.id=a.volunteer_id AND v.organization_id=a.organization_id
 JOIN public.guard_shifts s ON s.id=a.shift_id JOIN public.guard_slots p ON p.id=a.slot_id
 WHERE a.organization_id=_org AND v.user_id=auth.uid() AND s.status<>'borrador';
END $$;
REVOKE ALL ON FUNCTION public.guard_my_assignments(uuid) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_my_assignments(uuid) TO authenticated;

-- Explicit bootstrap: global superadmin enrolls a DIFFERENT active Corps admin.
CREATE FUNCTION public.guard_set_issuer(_org uuid,_target uuid,_grant boolean,_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE iid uuid; oldrow jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_superadmin() THEN RAISE EXCEPTION 'global authorization required' USING ERRCODE='42501'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'read committed required' USING ERRCODE='40001'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('guard-org:'||_org::text,0));
 IF _target IS NULL OR _target=auth.uid() OR _grant IS NULL OR _reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'invalid issuer authorization' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_org AND status='active') THEN RAISE EXCEPTION 'organization unavailable'; END IF;
 SELECT id,to_jsonb(i) INTO iid,oldrow FROM public.guard_permission_issuers i WHERE organization_id=_org AND user_id=_target AND revoked_at IS NULL FOR UPDATE;
 IF _grant THEN
  IF iid IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=_org AND user_id=_target AND role='admin' AND status='active' AND company_id IS NULL) THEN RAISE EXCEPTION 'issuer unavailable'; END IF;
  INSERT INTO public.guard_permission_issuers(organization_id,user_id,authorized_by,reason) VALUES(_org,_target,auth.uid(),btrim(_reason)) RETURNING id INTO iid;
 ELSE
  IF iid IS NULL THEN RAISE EXCEPTION 'issuer unavailable'; END IF;
  UPDATE public.guard_permission_issuers SET revoked_at=now(),revoked_by=auth.uid() WHERE id=iid;
 END IF;
 PERFORM public.guard_record(_org,NULL,NULL,'GUARD_ISSUER',oldrow,jsonb_build_object('issuer_id',iid,'grant',_grant,'reason',btrim(_reason)));
 RETURN iid;
END $$;
REVOKE ALL ON FUNCTION public.guard_set_issuer(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_set_issuer(uuid,uuid,boolean,text) TO authenticated;

-- One transaction, new empty draft and explicit new slots; NEVER transfer participants.
CREATE FUNCTION public.guard_replace_shift(_org uuid,_original uuid,_expected text,_name text,_start timestamptz,_end timestamptz,_mode text,_slots jsonb,_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE original public.guard_shifts; replacement uuid; slot jsonb;
BEGIN
 PERFORM public.guard_lock(_org);
 SELECT * INTO original FROM public.guard_shifts WHERE id=_original AND organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'original unavailable'; END IF;
 PERFORM public.guard_manage_required(_org,original.company_id);
 IF _expected IS NULL OR original.status<>_expected OR original.status NOT IN ('borrador','publicado') OR EXISTS(SELECT 1 FROM public.guard_attendance_events WHERE shift_id=_original) THEN RAISE EXCEPTION 'only unstarted shift without attendance replaceable'; END IF;
 IF _reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 3 AND 1000 OR _slots IS NULL OR jsonb_typeof(_slots)<>'array' THEN RAISE EXCEPTION 'invalid replacement'; END IF;
 IF jsonb_array_length(_slots) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid slots count'; END IF;
 PERFORM public.guard_transition(_org,_original,_expected,'cancelado',_reason);
 replacement := public.guard_create_shift(_org,original.company_id,_name,_start,_end,_mode);
 UPDATE public.guard_shifts SET replaces_shift_id=_original WHERE id=replacement;
 FOR slot IN SELECT value FROM jsonb_array_elements(_slots) LOOP
  IF jsonb_typeof(slot)<>'object' OR NOT (slot ?& ARRAY['role','mode','start','end','capacity','critical','specialties']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(slot) k WHERE k NOT IN ('role','mode','start','end','capacity','critical','specialties')) OR jsonb_typeof(slot->'specialties')<>'array' THEN RAISE EXCEPTION 'invalid slot specification'; END IF;
  PERFORM public.guard_create_slot(_org,replacement,slot->>'role',slot->>'mode',(slot->>'start')::timestamptz,(slot->>'end')::timestamptz,(slot->>'capacity')::integer,(slot->>'critical')::boolean,ARRAY(SELECT jsonb_array_elements_text(slot->'specialties')));
 END LOOP;
 PERFORM public.guard_record(_org,original.company_id,replacement,'GUARD_EDIT',NULL,jsonb_build_object('replaces_shift_id',_original,'reason',btrim(_reason)));
 RETURN replacement;
END $$;
REVOKE ALL ON FUNCTION public.guard_replace_shift(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_replace_shift(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) TO authenticated;
-- REVIEW ONLY: structural triggers apply also to internal/service writes.
CREATE FUNCTION public.guard_integrity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.guard_shifts; p public.guard_slots; a public.guard_assignments;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'guard history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'guard identity immutable'; END IF;
  IF TG_TABLE_NAME IN ('guard_attendance_events','guard_audit_links') THEN RAISE EXCEPTION 'guard history append only'; END IF;
 END IF;
 IF TG_TABLE_NAME='guard_shifts' THEN
  IF NOT isfinite(NEW.starts_at) OR NOT isfinite(NEW.ends_at) THEN RAISE EXCEPTION 'finite time required'; END IF;
  IF TG_OP='UPDATE' AND (NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.mode IS DISTINCT FROM OLD.mode)
  AND EXISTS(SELECT 1 FROM public.guard_slots WHERE shift_id=NEW.id) THEN RAISE EXCEPTION 'schedule with slots immutable'; END IF;
 ELSIF TG_TABLE_NAME='guard_slots' THEN
  SELECT * INTO s FROM public.guard_shifts WHERE id=NEW.shift_id AND organization_id=NEW.organization_id AND company_id=NEW.company_id;
  IF NOT FOUND OR NEW.starts_at<s.starts_at OR NEW.ends_at>s.ends_at OR (s.mode<>'mixta' AND s.mode<>NEW.mode) THEN RAISE EXCEPTION 'slot outside shift scope'; END IF;
  IF TG_OP='UPDATE' AND (NEW.shift_id IS DISTINCT FROM OLD.shift_id OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.mode IS DISTINCT FROM OLD.mode OR NEW.capacity IS DISTINCT FROM OLD.capacity)
  AND EXISTS(SELECT 1 FROM public.guard_assignments WHERE slot_id=NEW.id) THEN RAISE EXCEPTION 'assigned slot immutable'; END IF;
 ELSIF TG_TABLE_NAME IN ('guard_assignments','guard_applications') THEN
  SELECT * INTO p FROM public.guard_slots WHERE id=NEW.slot_id AND shift_id=NEW.shift_id AND organization_id=NEW.organization_id AND company_id=NEW.company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid slot'; END IF;
  -- Current affiliation is required on creation. Retiring/rejecting history must survive a later transfer.
  IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM public.volunteers v WHERE v.id=NEW.volunteer_id AND v.organization_id=NEW.organization_id AND v.company_id=NEW.company_id) THEN RAISE EXCEPTION 'invalid volunteer company'; END IF;
  IF TG_OP='UPDATE' AND TG_TABLE_NAME='guard_applications' AND
  (NEW.volunteer_id IS DISTINCT FROM OLD.volunteer_id OR NEW.slot_id IS DISTINCT FROM OLD.slot_id OR NEW.shift_id IS DISTINCT FROM OLD.shift_id OR NEW.status='aprobada') AND
  NOT EXISTS(SELECT 1 FROM public.volunteers v WHERE v.id=NEW.volunteer_id AND v.organization_id=NEW.organization_id AND v.company_id=NEW.company_id) THEN RAISE EXCEPTION 'application eligibility changed'; END IF;
  IF TG_TABLE_NAME='guard_assignments' THEN
   IF NEW.starts_at IS DISTINCT FROM p.starts_at OR NEW.ends_at IS DISTINCT FROM p.ends_at THEN RAISE EXCEPTION 'assignment period differs from slot'; END IF;
   IF TG_OP='UPDATE' AND (NEW.volunteer_id IS DISTINCT FROM OLD.volunteer_id OR NEW.slot_id IS DISTINCT FROM OLD.slot_id OR NEW.shift_id IS DISTINCT FROM OLD.shift_id) THEN RAISE EXCEPTION 'assignment identity immutable'; END IF;
  ELSIF NEW.status='aprobada' AND (NEW.decided_by IS NULL OR EXISTS(SELECT 1 FROM public.volunteers v WHERE v.id=NEW.volunteer_id AND v.user_id=NEW.decided_by)) THEN RAISE EXCEPTION 'self approval forbidden'; END IF;
 ELSIF TG_TABLE_NAME='guard_swap_requests' THEN
  SELECT * INTO a FROM public.guard_assignments WHERE id=NEW.assignment_id AND shift_id=NEW.shift_id AND organization_id=NEW.organization_id AND company_id=NEW.company_id;
  IF NOT FOUND OR a.volunteer_id<>NEW.original_volunteer_id OR NOT EXISTS(SELECT 1 FROM public.volunteers WHERE id=NEW.replacement_volunteer_id AND organization_id=NEW.organization_id AND company_id=NEW.company_id) THEN RAISE EXCEPTION 'swap scope mismatch'; END IF;
  IF NEW.counterpart_assignment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.guard_assignments x WHERE x.id=NEW.counterpart_assignment_id AND x.organization_id=NEW.organization_id AND x.company_id=NEW.company_id AND x.volunteer_id=NEW.replacement_volunteer_id) THEN RAISE EXCEPTION 'counterpart mismatch'; END IF;
  IF NEW.status='aprobada' AND (NEW.decided_by IS NULL OR NEW.accepted_at IS NULL OR EXISTS(SELECT 1 FROM public.volunteers v WHERE v.id IN (NEW.original_volunteer_id,NEW.replacement_volunteer_id) AND v.user_id=NEW.decided_by)) THEN RAISE EXCEPTION 'self approval or missing acceptance'; END IF;
 ELSIF TG_TABLE_NAME='guard_attendance_events' THEN
  SELECT * INTO a FROM public.guard_assignments WHERE id=NEW.assignment_id AND shift_id=NEW.shift_id AND organization_id=NEW.organization_id AND company_id=NEW.company_id;
  IF NOT FOUND OR a.volunteer_id<>NEW.volunteer_id OR NOT isfinite(NEW.occurred_at) THEN RAISE EXCEPTION 'attendance scope mismatch'; END IF;
  IF NEW.kind NOT IN ('llegada','salida') AND (NEW.reason IS NULL OR length(btrim(NEW.reason)) NOT BETWEEN 3 AND 1000) THEN RAISE EXCEPTION 'event reason required'; END IF;
  IF NEW.kind='validacion' AND (NEW.decision IS NULL OR EXISTS(SELECT 1 FROM public.volunteers v WHERE v.id=NEW.volunteer_id AND v.user_id=NEW.actor_id)) THEN RAISE EXCEPTION 'self validation forbidden'; END IF;
 ELSIF TG_TABLE_NAME='guard_audit_links' THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log x WHERE x.id=NEW.audit_id AND x.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'audit organization mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_integrity() FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
CREATE TRIGGER guard_permissions_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_permissions FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_shifts_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_shifts FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_slots_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_slots FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_assignments_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_applications_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_applications FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_swap_requests_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_swap_requests FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_attendance_events_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_attendance_events FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER company_guard_rules_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.company_guard_rules FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_templates_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_templates FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_notification_outbox_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_notification_outbox FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();
CREATE TRIGGER guard_audit_links_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.guard_audit_links FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();

-- Generic callers retain exact signature/return behavior, but cannot claim Guard events.
-- Authority is the protected relational link, never this reserved namespace check alone.
CREATE OR REPLACE FUNCTION app_private.insert_audit_log(_organization_id uuid,_action text,_table_name text DEFAULT NULL::text,_record_id uuid DEFAULT NULL::uuid,_old_data jsonb DEFAULT NULL::jsonb,_new_data jsonb DEFAULT NULL::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE aid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión para registrar auditoría'; END IF;
 IF NOT app_private.is_superadmin() AND NOT app_private.is_org_member(_organization_id) THEN RAISE EXCEPTION 'No perteneces a esta organización'; END IF;
 IF upper(btrim(_action)) LIKE 'GUARD\_%' ESCAPE '\' OR lower(btrim(_table_name)) LIKE 'guard\_%' ESCAPE '\' OR lower(btrim(_table_name))='company_guard_rules' THEN RAISE EXCEPTION 'reserved authoritative audit channel' USING ERRCODE='42501'; END IF;
 INSERT INTO public.audit_log(organization_id,user_id,action,table_name,record_id,old_data,new_data)
 VALUES(_organization_id,auth.uid(),left(_action,120),_table_name,_record_id,_old_data,_new_data) RETURNING id INTO aid;
 RETURN aid;
END $$;
REVOKE ALL ON FUNCTION app_private.insert_audit_log(uuid,text,text,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION app_private.insert_audit_log(uuid,text,text,uuid,jsonb,jsonb) TO authenticated,service_role;
-- Remove ACL paths that RLS cannot restrict. Generic four client calls still EXECUTE.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.audit_log FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;

CREATE TRIGGER guard_issuers_no_delete BEFORE DELETE ON public.guard_permission_issuers FOR EACH ROW EXECUTE FUNCTION public.guard_integrity();

-- Separate Guard authorization from ordinary membership administration, preserving UI writes.
-- Trigger locks even privileged/invitation changes without requiring the actor to be a member.
CREATE FUNCTION public.guard_membership_invalidate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE oldorg uuid; neworg uuid; olduser uuid; newuser uuid; org uuid; p record; i record; aid uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id AND NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF TG_OP<>'INSERT' THEN oldorg:=OLD.organization_id; olduser:=OLD.user_id; END IF;
 IF TG_OP<>'DELETE' THEN neworg:=NEW.organization_id; newuser:=NEW.user_id; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'retry membership change in read committed' USING ERRCODE='40001'; END IF;
 FOR org IN SELECT DISTINCT x FROM unnest(ARRAY[oldorg,neworg]) x WHERE x IS NOT NULL ORDER BY x LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('guard-org:'||org::text,0));
 END LOOP;
 FOR p IN SELECT * FROM public.guard_permissions WHERE revoked_at IS NULL AND ((organization_id=oldorg AND user_id=olduser) OR (organization_id=neworg AND user_id=newuser)) FOR UPDATE LOOP
  -- No identity-less revocation when protected rights exist; unrelated maintenance unaffected.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authenticated actor required to invalidate guard rights' USING ERRCODE='42501'; END IF;
  UPDATE public.guard_permissions SET revoked_at=now(),revoked_by=auth.uid() WHERE id=p.id;
  INSERT INTO public.audit_log(organization_id,user_id,action,table_name,record_id,old_data,new_data)
  VALUES(p.organization_id,auth.uid(),'GUARD_MEMBERSHIP_INVALIDATE','guard_permissions',p.id,to_jsonb(p),jsonb_build_object('operation',TG_OP,'revoked',true)) RETURNING id INTO aid;
  INSERT INTO public.guard_audit_links(organization_id,company_id,audit_id,event_name,summary)
  VALUES(p.organization_id,p.company_id,aid,'GUARD_MEMBERSHIP_INVALIDATE',jsonb_build_object('permission_id',p.id,'operation',TG_OP));
 END LOOP;
 FOR i IN SELECT * FROM public.guard_permission_issuers WHERE revoked_at IS NULL AND ((organization_id=oldorg AND user_id=olduser) OR (organization_id=neworg AND user_id=newuser)) FOR UPDATE LOOP
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authenticated actor required to invalidate issuer' USING ERRCODE='42501'; END IF;
  UPDATE public.guard_permission_issuers SET revoked_at=now(),revoked_by=auth.uid() WHERE id=i.id;
  INSERT INTO public.audit_log(organization_id,user_id,action,table_name,record_id,old_data,new_data)
  VALUES(i.organization_id,auth.uid(),'GUARD_ISSUER_INVALIDATE','guard_permission_issuers',i.id,to_jsonb(i),jsonb_build_object('operation',TG_OP,'revoked',true)) RETURNING id INTO aid;
  INSERT INTO public.guard_audit_links(organization_id,audit_id,event_name,summary)
  VALUES(i.organization_id,aid,'GUARD_ISSUER_INVALIDATE',jsonb_build_object('issuer_id',i.id,'operation',TG_OP));
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_membership_invalidate() FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
-- AFTER INSERT avoids revocations on ON CONFLICT DO NOTHING attempts.
CREATE TRIGGER guard_membership_change BEFORE UPDATE OR DELETE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.guard_membership_invalidate();
CREATE TRIGGER guard_membership_insert AFTER INSERT ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.guard_membership_invalidate();
-- TRUNCATE would bypass the row trigger. Preserve existing ordinary DML and RLS.
REVOKE TRUNCATE,TRIGGER,REFERENCES ON public.organization_members FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
-- REVIEW ONLY. Add after the existing v3 01/02/03; never apply automatically.
-- Invoker wrapper: delegates authorization, locking, constraints and audit to v3.
-- One RPC statement = one transaction. No exception handler or compensating delete.
CREATE FUNCTION public.guard_create_draft(
 _org uuid, _company uuid, _name text, _start timestamptz,
 _end timestamptz, _mode text, _slots jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE sid uuid; slot jsonb;
BEGIN
 IF _slots IS NULL OR jsonb_typeof(_slots)<>'array' THEN
  RAISE EXCEPTION 'slots array required' USING ERRCODE='22023';
 END IF;
 -- Same batch limit as guard_replace_shift, not a new business limit.
 IF jsonb_array_length(_slots) NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'invalid slots count' USING ERRCODE='22023';
 END IF;
 sid := public.guard_create_shift(_org,_company,_name,_start,_end,_mode);
 FOR slot IN SELECT value FROM jsonb_array_elements(_slots) LOOP
  IF jsonb_typeof(slot)<>'object' THEN
   RAISE EXCEPTION 'slot object required' USING ERRCODE='22023';
  END IF;
  IF NOT (slot ?& ARRAY['role','mode','start','end','capacity','critical','specialties'])
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(slot) k
             WHERE k NOT IN ('role','mode','start','end','capacity','critical','specialties'))
   OR jsonb_typeof(slot->'role') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'mode') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'start') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'end') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'capacity') IS DISTINCT FROM 'number'
   OR jsonb_typeof(slot->'critical') IS DISTINCT FROM 'boolean'
   OR jsonb_typeof(slot->'specialties') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'invalid slot specification' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(slot->'specialties') v
            WHERE jsonb_typeof(v) IS DISTINCT FROM 'string') THEN
   RAISE EXCEPTION 'invalid specialties' USING ERRCODE='22023';
  END IF;
  PERFORM public.guard_create_slot(_org,sid,slot->>'role',slot->>'mode',
   (slot->>'start')::timestamptz,(slot->>'end')::timestamptz,
   (slot->>'capacity')::integer,(slot->>'critical')::boolean,
   ARRAY(SELECT jsonb_array_elements_text(slot->'specialties')));
 END LOOP;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.guard_create_draft(uuid,uuid,text,timestamptz,timestamptz,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_create_draft(uuid,uuid,text,timestamptz,timestamptz,text,jsonb)
 TO authenticated;