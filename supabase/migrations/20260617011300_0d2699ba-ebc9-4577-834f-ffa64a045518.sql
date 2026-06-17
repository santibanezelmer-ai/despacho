CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.superadmins
    WHERE user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION app_private.get_my_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.has_org_role(_org_id uuid, _role public.org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role = _role
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_in_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND status = 'active'
      AND role IN ('admin','operador','oficial')
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_volunteer(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role = 'voluntario'::public.org_role
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_admin_of_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om1
    JOIN public.organization_members om2
      ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
      AND om1.role = 'admin'
      AND om1.status = 'active'
      AND om2.user_id = _target_user_id
      AND om2.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR app_private.is_superadmin())
  )
$$;

CREATE OR REPLACE FUNCTION app_private.get_user_roles(_user_id uuid)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (_user_id = auth.uid() OR app_private.is_superadmin())
$$;

CREATE OR REPLACE FUNCTION app_private.is_demo_org_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT (app_private.is_superadmin() OR app_private.is_org_member(_org_id)) THEN false
    ELSE COALESCE(
      (SELECT NOT is_demo OR (demo_expires_at IS NOT NULL AND demo_expires_at > now())
       FROM public.organizations
       WHERE id = _org_id),
      false
    )
  END
$$;

CREATE OR REPLACE FUNCTION app_private.demo_emergency_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT (app_private.is_superadmin() OR app_private.is_org_member(_org_id)) THEN 0
    ELSE (SELECT COUNT(*)::int FROM public.emergencies WHERE organization_id = _org_id)
  END
$$;

CREATE OR REPLACE FUNCTION app_private.insert_audit_log(
  _organization_id uuid,
  _action text,
  _table_name text DEFAULT NULL::text,
  _record_id uuid DEFAULT NULL::uuid,
  _old_data jsonb DEFAULT NULL::jsonb,
  _new_data jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar auditoría';
  END IF;

  IF NOT app_private.is_superadmin() AND NOT app_private.is_org_member(_organization_id) THEN
    RAISE EXCEPTION 'No perteneces a esta organización';
  END IF;

  INSERT INTO public.audit_log (organization_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (_organization_id, auth.uid(), left(_action, 120), _table_name, _record_id, _old_data, _new_data)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.get_invitation_preview(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
BEGIN
  SELECT i.email, i.role, i.status, i.expires_at, i.organization_id, o.name AS org_name
  INTO _inv
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'email', _inv.email,
    'role', _inv.role,
    'status', _inv.status,
    'expires_at', _inv.expires_at,
    'organization_name', _inv.org_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION app_private.accept_invitation(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para aceptar la invitación';
  END IF;

  SELECT * INTO _inv
  FROM public.organization_invitations
  WHERE token = _token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;

  IF _inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta invitación ya fue %', _inv.status;
  END IF;

  IF _inv.expires_at < now() THEN
    UPDATE public.organization_invitations
    SET status = 'expired'
    WHERE id = _inv.id;
    RAISE EXCEPTION 'La invitación expiró';
  END IF;

  _user_email := lower(auth.jwt() ->> 'email');
  IF _user_email IS DISTINCT FROM lower(_inv.email) THEN
    RAISE EXCEPTION 'Esta invitación es para % y tu sesión es %', _inv.email, _user_email;
  END IF;

  INSERT INTO public.organization_members (user_id, organization_id, role, status, invited_by)
  VALUES (auth.uid(), _inv.organization_id, _inv.role, 'active', _inv.invited_by)
  ON CONFLICT DO NOTHING;

  IF _inv.role = 'voluntario'::public.org_role THEN
    UPDATE public.volunteers
    SET user_id = auth.uid()
    WHERE organization_id = _inv.organization_id
      AND lower(email) = lower(_inv.email)
      AND user_id IS NULL;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _inv.id;

  RETURN jsonb_build_object('organization_id', _inv.organization_id, 'role', _inv.role);
END;
$$;

GRANT EXECUTE ON FUNCTION app_private.is_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_my_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_org_role(uuid, public.org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_write_in_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_volunteer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin_of_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_demo_org_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.demo_emergency_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.insert_audit_log(uuid, text, text, uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_invitation_preview(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.accept_invitation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.is_superadmin()
$$;

CREATE OR REPLACE FUNCTION public.get_my_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.get_my_organization_ids()
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.is_org_member(_org_id)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _role public.org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.has_org_role(_org_id, _role)
$$;

CREATE OR REPLACE FUNCTION public.can_write_in_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.can_write_in_org(_org_id)
$$;

CREATE OR REPLACE FUNCTION public.is_org_volunteer(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.is_org_volunteer(_org_id)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_of_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.is_org_admin_of_user(_target_user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.has_role(_user_id, _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.get_user_roles(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_demo_org_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.is_demo_org_active(_org_id)
$$;

CREATE OR REPLACE FUNCTION public.demo_emergency_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.demo_emergency_count(_org_id)
$$;

CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _organization_id uuid,
  _action text,
  _table_name text DEFAULT NULL::text,
  _record_id uuid DEFAULT NULL::uuid,
  _old_data jsonb DEFAULT NULL::jsonb,
  _new_data jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.insert_audit_log(_organization_id, _action, _table_name, _record_id, _old_data, _new_data)
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_preview(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.get_invitation_preview(_token)
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT app_private.accept_invitation(_token)
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_organization_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_in_org(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_volunteer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_of_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_demo_org_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.demo_emergency_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_preview(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_in_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_volunteer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin_of_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_demo_org_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_emergency_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, text, uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO anon, authenticated, service_role;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_email_format_chk
  CHECK (
    char_length(email) BETWEEN 3 AND 254
    AND email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ) NOT VALID,
  ADD CONSTRAINT leads_text_bounds_chk
  CHECK (
    (name IS NULL OR char_length(name) <= 120)
    AND (city IS NULL OR char_length(city) <= 120)
    AND (station_size IS NULL OR char_length(station_size) <= 80)
    AND (source IS NULL OR char_length(source) <= 80)
    AND (message IS NULL OR char_length(message) <= 2000)
  ) NOT VALID;

DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit validated lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(email) BETWEEN 3 AND 254
  AND email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  AND (name IS NULL OR char_length(name) <= 120)
  AND (city IS NULL OR char_length(city) <= 120)
  AND (station_size IS NULL OR char_length(station_size) <= 80)
  AND (source IS NULL OR char_length(source) <= 80)
  AND (message IS NULL OR char_length(message) <= 2000)
);