CREATE OR REPLACE FUNCTION public.claim_volunteer_activation_by_id(_volunteer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vol public.volunteers; _email text; _token uuid;
BEGIN
  SELECT * INTO _vol FROM public.volunteers WHERE id = _volunteer_id;
  IF NOT FOUND OR _vol.status = 'inactivo' THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF _vol.user_id IS NOT NULL THEN RETURN jsonb_build_object('status','already_active'); END IF;
  _email := lower(btrim(coalesce(_vol.email,'')));
  IF _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN jsonb_build_object('status','not_found'); END IF;
  SELECT token INTO _token FROM public.organization_invitations
   WHERE organization_id = _vol.organization_id AND lower(email) = _email AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;
  IF _token IS NULL THEN
    INSERT INTO public.organization_invitations (organization_id, email, role, expires_at)
    VALUES (_vol.organization_id, _email, 'voluntario', now() + interval '2 days') RETURNING token INTO _token;
    UPDATE public.volunteers SET invitation_sent_at = now() WHERE id = _vol.id;
  END IF;
  RETURN jsonb_build_object('status','ok','token',_token);
END; $$;
REVOKE ALL ON FUNCTION public.claim_volunteer_activation_by_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_volunteer_activation_by_id(uuid) TO service_role;