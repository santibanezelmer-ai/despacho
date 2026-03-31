-- Fix hydrant insert policy: allow operadores/oficiales, not just admins
DROP POLICY IF EXISTS hyd_insert ON public.hydrants;
CREATE POLICY hyd_insert ON public.hydrants FOR INSERT TO authenticated
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));