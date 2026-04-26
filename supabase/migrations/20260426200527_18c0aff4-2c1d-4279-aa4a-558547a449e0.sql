-- 1. Demo settings (singleton)
CREATE TABLE public.demo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_days int NOT NULL DEFAULT 14,
  max_emergencies int NOT NULL DEFAULT 20,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.demo_settings (duration_days, max_emergencies, enabled)
VALUES (14, 20, true);

ALTER TABLE public.demo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ds_select ON public.demo_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ds_update ON public.demo_settings
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY ds_no_insert ON public.demo_settings
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY ds_no_delete ON public.demo_settings
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 2. Mark organizations as demo
ALTER TABLE public.organizations
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN demo_expires_at timestamptz;

CREATE INDEX idx_organizations_is_demo ON public.organizations (is_demo) WHERE is_demo = true;

-- 3. Helper: is demo org still active?
CREATE OR REPLACE FUNCTION public.is_demo_org_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NOT is_demo OR (demo_expires_at IS NOT NULL AND demo_expires_at > now())
     FROM public.organizations WHERE id = _org_id),
    false
  )
$$;

-- 4. Helper: count emergencies in a demo org
CREATE OR REPLACE FUNCTION public.demo_emergency_count(_org_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.emergencies WHERE organization_id = _org_id
$$;

-- 5. Replace emg_insert policy to enforce demo limits
DROP POLICY IF EXISTS emg_insert ON public.emergencies;

CREATE POLICY emg_insert ON public.emergencies
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_superadmin() OR public.can_write_in_org(organization_id))
    AND (
      NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.is_demo)
      OR (
        public.is_demo_org_active(organization_id)
        AND public.demo_emergency_count(organization_id) < (SELECT max_emergencies FROM public.demo_settings LIMIT 1)
      )
    )
  );

-- 6. Updated handle_new_user: auto-create demo org and seed it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _company_id uuid;
  _vehicle_id uuid;
  _duration int;
  _enabled boolean;
  _slug text;
  _display text;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

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

  -- Seed: emergency keys
  INSERT INTO public.emergency_keys (organization_id, code, name, color, sort_order) VALUES
    (_org_id, '10-1', 'Incendio estructural', '#dc2626', 1),
    (_org_id, '10-2', 'Rescate vehicular', '#ea580c', 2),
    (_org_id, '10-3', 'Materiales peligrosos', '#facc15', 3),
    (_org_id, '10-4', 'Apoyo médico', '#16a34a', 4);

  -- Seed: company
  INSERT INTO public.companies (organization_id, name, number, address, active)
  VALUES (_org_id, 'Cía. Demo', 1, 'Cuartel central', true)
  RETURNING id INTO _company_id;

  -- Seed: vehicle
  INSERT INTO public.vehicles (organization_id, company_id, code, type, capacity, status)
  VALUES (_org_id, _company_id, 'B-1', 'Bomba', 6, 'disponible')
  RETURNING id INTO _vehicle_id;

  -- Seed: volunteer
  INSERT INTO public.volunteers (organization_id, company_id, name, status, available)
  VALUES (_org_id, _company_id, 'Voluntario Demo', 'activo', true);

  RETURN NEW;
END;
$$;

-- 7. Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();