
CREATE OR REPLACE FUNCTION app_private.demo_max_emergencies()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max_emergencies FROM public.demo_settings LIMIT 1
$$;
REVOKE ALL ON FUNCTION app_private.demo_max_emergencies() FROM PUBLIC;

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
      AND public.demo_emergency_count(organization_id) < app_private.demo_max_emergencies()
    )
  )
);

DROP FUNCTION IF EXISTS public.demo_max_emergencies();

REVOKE ALL ON FUNCTION public.get_demo_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_demo_limits() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_demo_limits() TO authenticated, service_role;
