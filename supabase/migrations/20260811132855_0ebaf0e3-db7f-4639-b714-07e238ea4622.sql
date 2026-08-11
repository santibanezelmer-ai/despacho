
-- Security-definer accessor for demo limits (so app can read limits without exposing the table)
CREATE OR REPLACE FUNCTION public.get_demo_limits()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'duration_days', duration_days,
    'max_emergencies', max_emergencies,
    'enabled', enabled
  )
  FROM public.demo_settings
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_demo_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_demo_limits() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.demo_max_emergencies()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max_emergencies FROM public.demo_settings LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.demo_max_emergencies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_max_emergencies() TO authenticated, service_role;

-- Restrict demo_settings reads to superadmins
DROP POLICY IF EXISTS ds_select ON public.demo_settings;
CREATE POLICY ds_select ON public.demo_settings
FOR SELECT TO authenticated
USING (public.is_superadmin());

-- Keep demo emergency limit enforcement working without reading demo_settings directly
DROP POLICY IF EXISTS emg_insert ON public.emergencies;
CREATE POLICY emg_insert ON public.emergencies
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_superadmin() OR public.can_write_in_org(organization_id))
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = emergencies.organization_id AND o.is_demo
    )
    OR (
      public.is_demo_org_active(organization_id)
      AND public.demo_emergency_count(organization_id) < public.demo_max_emergencies()
    )
  )
);

-- Explicit, role-scoped DELETE path for emergency records
DROP POLICY IF EXISTS emg_delete ON public.emergencies;
CREATE POLICY emg_delete ON public.emergencies
FOR DELETE TO authenticated
USING (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
);
