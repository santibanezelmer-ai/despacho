-- PREPARED ONLY. Do not apply without Susana's specific authorization.
CREATE TABLE public.monthly_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, period)
);
GRANT ALL ON public.monthly_report_snapshots TO service_role;
ALTER TABLE public.monthly_report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshots_service ON public.monthly_report_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.monthly_report_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid,
  FOREIGN KEY (report_id, organization_id) REFERENCES public.monthly_report_snapshots(id, organization_id)
);
GRANT ALL ON public.monthly_report_access_tokens TO service_role;
ALTER TABLE public.monthly_report_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tokens_service ON public.monthly_report_access_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.monthly_report_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  access_id uuid NOT NULL REFERENCES public.monthly_report_access_tokens(id),
  action text NOT NULL CHECK (action IN ('issued','view','download','revoked')),
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT ALL ON public.monthly_report_access_audit TO service_role;
ALTER TABLE public.monthly_report_access_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_service ON public.monthly_report_access_audit FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.monthly_report_history_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  RAISE EXCEPTION 'Immutable report history';
END $$;
CREATE TRIGGER monthly_report_snapshot_immutable BEFORE UPDATE OR DELETE ON public.monthly_report_snapshots FOR EACH ROW EXECUTE FUNCTION public.monthly_report_history_immutable();
CREATE TRIGGER monthly_report_audit_immutable BEFORE UPDATE OR DELETE ON public.monthly_report_access_audit FOR EACH ROW EXECUTE FUNCTION public.monthly_report_history_immutable();

CREATE FUNCTION public.monthly_report_token_dates() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.issued_at := clock_timestamp();
    -- 15 calendar dates at the same Chile local time, including DST changes.
    NEW.expires_at := ((NEW.issued_at AT TIME ZONE 'America/Santiago') + interval '15 days') AT TIME ZONE 'America/Santiago';
  ELSIF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.report_id IS DISTINCT FROM OLD.report_id
    OR NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
    OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN
    RAISE EXCEPTION 'Immutable report access';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER monthly_report_token_dates BEFORE INSERT OR UPDATE ON public.monthly_report_access_tokens FOR EACH ROW EXECUTE FUNCTION public.monthly_report_token_dates();

CREATE FUNCTION public.monthly_report_consume(_hash text, _action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.monthly_report_access_tokens; s public.monthly_report_snapshots;
BEGIN
  IF _action NOT IN ('view','download') OR _hash !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('state','invalid'); END IF;
  SELECT * INTO t FROM public.monthly_report_access_tokens WHERE token_hash = _hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','invalid'); END IF;
  IF t.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('state','revoked'); END IF;
  IF clock_timestamp() >= t.expires_at THEN RETURN jsonb_build_object('state','expired'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=t.organization_id AND status='active')
    OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=t.organization_id AND user_id=t.recipient_user_id AND status='active' AND (role='oficial' OR (role='admin' AND company_id IS NULL)))
    THEN RETURN jsonb_build_object('state','unavailable'); END IF;
  SELECT * INTO s FROM public.monthly_report_snapshots WHERE id=t.report_id AND organization_id=t.organization_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','invalid'); END IF;
  INSERT INTO public.monthly_report_access_audit(organization_id,access_id,action) VALUES(t.organization_id,t.id,_action);
  RETURN jsonb_build_object('state','active','report',s.report,'expires_at',t.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.monthly_report_consume(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_report_consume(text,text) TO service_role;

CREATE FUNCTION public.monthly_report_revoke(_org uuid, _id uuid, _actor uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=_org AND user_id=_actor AND status='active' AND role='admin' AND company_id IS NULL) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.monthly_report_access_tokens SET revoked_at=clock_timestamp(), revoked_by=_actor
    WHERE id=_id AND organization_id=_org AND revoked_at IS NULL RETURNING id INTO changed;
  IF changed IS NULL THEN RETURN false; END IF;
  INSERT INTO public.monthly_report_access_audit(organization_id,access_id,action,actor_user_id) VALUES(_org,_id,'revoked',_actor);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.monthly_report_revoke(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_report_revoke(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.monthly_report_issue(_org uuid, _report uuid, _recipient uuid, _hash text, _actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.monthly_report_access_tokens;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=_org AND user_id=_actor AND status='active' AND role='admin' AND company_id IS NULL)
    OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=_org AND user_id=_recipient AND status='active' AND (role='oficial' OR (role='admin' AND company_id IS NULL)))
    OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=_org AND status='active') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.monthly_report_access_tokens(organization_id,report_id,recipient_user_id,token_hash)
    VALUES(_org,_report,_recipient,_hash) RETURNING * INTO t;
  INSERT INTO public.monthly_report_access_audit(organization_id,access_id,action,actor_user_id) VALUES(_org,t.id,'issued',_actor);
  RETURN jsonb_build_object('id',t.id,'expires_at',t.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.monthly_report_issue(uuid,uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_report_issue(uuid,uuid,uuid,text,uuid) TO service_role;

CREATE TABLE public.monthly_report_access_limits (
  key_hash text PRIMARY KEY,
  window_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz
);
GRANT ALL ON public.monthly_report_access_limits TO service_role;
ALTER TABLE public.monthly_report_access_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY limits_service ON public.monthly_report_access_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.monthly_report_rate_gate(_origin text, _link text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; max_requests integer; r public.monthly_report_access_limits; instant timestamptz := clock_timestamp();
BEGIN
  IF _origin !~ '^[0-9a-f]{64}$' OR _link !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  -- Serialize all checks in a consistent order; limits span all server instances.
  FOR k, max_requests IN SELECT * FROM (VALUES ('global',600), ('origin:' || _origin,30), ('link:' || _link,10)) AS v(key,quota) ORDER BY key LOOP
    INSERT INTO public.monthly_report_access_limits(key_hash,window_at) VALUES(k,instant) ON CONFLICT DO NOTHING;
    SELECT * INTO r FROM public.monthly_report_access_limits WHERE key_hash=k FOR UPDATE;
    IF r.blocked_until > instant THEN RETURN false; END IF;
    IF r.window_at <= instant - interval '1 minute' THEN
      r.window_at := instant; r.attempts := 0;
    END IF;
    r.attempts := r.attempts + 1;
    UPDATE public.monthly_report_access_limits SET window_at=r.window_at,attempts=r.attempts,
      blocked_until=CASE WHEN r.attempts > max_requests THEN instant + interval '10 minutes' ELSE NULL END WHERE key_hash=k;
    IF r.attempts > max_requests THEN RETURN false; END IF;
  END LOOP;
  -- Opportunistic bounded housekeeping, no cron or deletion of report history.
  DELETE FROM public.monthly_report_access_limits WHERE key_hash IN
    (SELECT key_hash FROM public.monthly_report_access_limits WHERE window_at < instant - interval '1 day' AND (blocked_until IS NULL OR blocked_until < instant) LIMIT 100);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.monthly_report_rate_gate(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_report_rate_gate(text,text) TO service_role;
