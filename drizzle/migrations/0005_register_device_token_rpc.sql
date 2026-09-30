CREATE OR REPLACE FUNCTION public.register_device_token(_token text, _platform text, _organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _token IS NULL OR length(_token) < 10 THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = _uid AND organization_id = _organization_id AND status = 'active') THEN
    RAISE EXCEPTION 'not a member of organization';
  END IF;
  -- El mismo teléfono pudo quedar registrado con otra cuenta: se reasigna al usuario actual
  INSERT INTO device_tokens (user_id, organization_id, token, platform, last_seen_at, updated_at)
  VALUES (_uid, _organization_id, _token, _platform, now(), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id, organization_id = EXCLUDED.organization_id,
        platform = EXCLUDED.platform, last_seen_at = now(), updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.register_device_token(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text, uuid) TO authenticated;