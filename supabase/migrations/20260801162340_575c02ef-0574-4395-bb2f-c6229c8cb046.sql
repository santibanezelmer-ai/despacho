-- location_pings: explicit deny of client writes (server/service_role only)
REVOKE INSERT, UPDATE, DELETE ON public.location_pings FROM anon, authenticated;

DROP POLICY IF EXISTS "location_pings_no_client_insert" ON public.location_pings;
CREATE POLICY "location_pings_no_client_insert"
ON public.location_pings FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "location_pings_no_client_update" ON public.location_pings;
CREATE POLICY "location_pings_no_client_update"
ON public.location_pings FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "location_pings_no_client_delete" ON public.location_pings;
CREATE POLICY "location_pings_no_client_delete"
ON public.location_pings FOR DELETE TO anon, authenticated
USING (false);

-- organization_requests: add WITH CHECK for defense in depth
DROP POLICY IF EXISTS "req_update" ON public.organization_requests;
CREATE POLICY "req_update" ON public.organization_requests
FOR UPDATE TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());