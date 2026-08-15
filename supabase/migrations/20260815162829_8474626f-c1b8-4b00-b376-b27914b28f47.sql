-- 1. emergency_keys: close UPDATE org-reassignment gap + require active (non-expired demo) org
DROP POLICY IF EXISTS ek_insert ON public.emergency_keys;
DROP POLICY IF EXISTS ek_update ON public.emergency_keys;
DROP POLICY IF EXISTS ek_delete ON public.emergency_keys;

CREATE POLICY ek_insert ON public.emergency_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (public.has_org_role(organization_id, 'admin'::org_role)
        AND public.is_demo_org_active(organization_id))
  );

CREATE POLICY ek_update ON public.emergency_keys
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR (public.has_org_role(organization_id, 'admin'::org_role)
        AND public.is_demo_org_active(organization_id))
  )
  WITH CHECK (
    public.is_superadmin()
    OR (public.has_org_role(organization_id, 'admin'::org_role)
        AND public.is_demo_org_active(organization_id))
  );

CREATE POLICY ek_delete ON public.emergency_keys
  FOR DELETE TO authenticated
  USING (
    public.is_superadmin()
    OR (public.has_org_role(organization_id, 'admin'::org_role)
        AND public.is_demo_org_active(organization_id))
  );

-- 2. user_roles: replace broad ALL policy with explicit, superadmin-only write policies
DROP POLICY IF EXISTS ur_manage ON public.user_roles;

CREATE POLICY ur_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY ur_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY ur_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_superadmin());