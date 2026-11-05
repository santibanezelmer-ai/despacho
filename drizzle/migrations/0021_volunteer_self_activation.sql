CREATE OR REPLACE FUNCTION public.claim_volunteer_activation(_org_slug text, _rut text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org public.organizations;
  _vol public.volunteers;
  _norm_rut text;
  _norm_email text;
  _token uuid;
BEGIN
  _norm_rut := upper(regexp_replace(coalesce(_rut,''), '[^0-9kK]', '', 'g'));
  _norm_email := lower(btrim(coalesce(_email,'')));
  IF length(_norm_rut) NOT BETWEEN 7 AND 10 OR _norm_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_norm_email) > 255 THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;

  SELECT * INTO _org FROM public.organizations WHERE slug = lower(btrim(_org_slug)) AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;

  SELECT * INTO _vol FROM public.volunteers
   WHERE organization_id = _org.id
     AND upper(regexp_replace(coalesce(rut,''), '[^0-9kK]', '', 'g')) = _norm_rut
     AND lower(btrim(coalesce(email,''))) = _norm_email
   LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF _vol.user_id IS NOT NULL THEN RETURN jsonb_build_object('status','already_active'); END IF;
  IF _vol.status = 'inactivo' THEN RETURN jsonb_build_object('status','not_found'); END IF;

  SELECT token INTO _token FROM public.organization_invitations
   WHERE organization_id = _org.id AND lower(email) = _norm_email AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF _token IS NULL THEN
    INSERT INTO public.organization_invitations (organization_id, email, role, expires_at)
    VALUES (_org.id, _norm_email, 'voluntario', now() + interval '2 days')
    RETURNING token INTO _token;
    UPDATE public.volunteers SET invitation_sent_at = now() WHERE id = _vol.id;
  END IF;

  RETURN jsonb_build_object('status','ok','token',_token);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_volunteer_activation(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_volunteer_activation(text,text,text) TO anon, authenticated;