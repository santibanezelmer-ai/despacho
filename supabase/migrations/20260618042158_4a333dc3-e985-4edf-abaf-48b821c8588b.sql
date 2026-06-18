CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _company_id uuid;
  _vehicle_id uuid;
  _duration int;
  _enabled boolean;
  _slug text;
  _display text;
  _invitation_token text;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Skip demo org creation when user is registering via an invitation
  _invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  IF _invitation_token IS NOT NULL AND _invitation_token <> '' THEN
    RETURN NEW;
  END IF;

  SELECT duration_days, enabled INTO _duration, _enabled FROM public.demo_settings LIMIT 1;
  IF _enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _display := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _slug := 'demo-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.organizations (name, slug, status, is_demo, demo_expires_at, created_by, plan)
  VALUES ('Demo - ' || _display, _slug, 'active', true, now() + (_duration || ' days')::interval, NEW.id, 'demo')
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (user_id, organization_id, role, status)
  VALUES (NEW.id, _org_id, 'admin', 'active');

  INSERT INTO public.emergency_keys (organization_id, code, name, color, sort_order) VALUES
    (_org_id, '10-1', 'Incendio estructural', '#dc2626', 1),
    (_org_id, '10-2', 'Rescate vehicular', '#ea580c', 2),
    (_org_id, '10-3', 'Materiales peligrosos', '#facc15', 3),
    (_org_id, '10-4', 'Apoyo médico', '#16a34a', 4);

  INSERT INTO public.companies (organization_id, name, number, address, active)
  VALUES (_org_id, 'Cía. Demo', 1, 'Cuartel central', true)
  RETURNING id INTO _company_id;

  INSERT INTO public.vehicles (organization_id, company_id, code, type, capacity, status)
  VALUES (_org_id, _company_id, 'B-1', 'Bomba', 6, 'disponible')
  RETURNING id INTO _vehicle_id;

  INSERT INTO public.volunteers (organization_id, company_id, name, status, available)
  VALUES (_org_id, _company_id, 'Voluntario Demo', 'activo', true);

  RETURN NEW;
END;
$$;