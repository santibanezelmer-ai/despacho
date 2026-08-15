-- 1. demo_settings: restrict SELECT to superadmins
DROP POLICY IF EXISTS ds_select ON public.demo_settings;
CREATE POLICY ds_select ON public.demo_settings
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- 2. location_requests: ensure tokens are never reachable by anonymous clients
REVOKE ALL ON public.location_requests FROM anon;
REVOKE ALL ON public.location_pings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_requests TO authenticated;
GRANT ALL ON public.location_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;