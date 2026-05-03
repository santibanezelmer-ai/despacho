
CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
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

  SELECT * INTO _inv FROM public.organization_invitations WHERE token = _token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;

  IF _inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta invitación ya fue %', _inv.status;
  END IF;

  IF _inv.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'La invitación expiró';
  END IF;

  _user_email := lower(auth.jwt() ->> 'email');
  IF _user_email IS DISTINCT FROM lower(_inv.email) THEN
    RAISE EXCEPTION 'Esta invitación es para % y tu sesión es %', _inv.email, _user_email;
  END IF;

  INSERT INTO public.organization_members (user_id, organization_id, role, status, invited_by)
  VALUES (auth.uid(), _inv.organization_id, _inv.role, 'active', _inv.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _inv.id;

  RETURN jsonb_build_object('organization_id', _inv.organization_id, 'role', _inv.role);
END;
$$;

-- Public lookup of invitation metadata by token (no auth required) so invitee
-- can see what org/role they were invited to before signing up
CREATE OR REPLACE FUNCTION public.get_invitation_preview(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _org_name text;
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

GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO anon, authenticated;
