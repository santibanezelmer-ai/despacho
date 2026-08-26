DROP POLICY IF EXISTS att_delete_self_or_admin ON public.emergency_attendance;
CREATE POLICY att_delete_self_or_admin ON public.emergency_attendance FOR DELETE TO authenticated
USING (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
  OR public.has_org_role(organization_id, 'oficial'::org_role)
  OR (auth.uid() = user_id AND public.is_org_member(organization_id))
);

DROP POLICY IF EXISTS att_update_self_or_admin ON public.emergency_attendance;
CREATE POLICY att_update_self_or_admin ON public.emergency_attendance FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
  OR public.has_org_role(organization_id, 'oficial'::org_role)
  OR (auth.uid() = user_id AND public.is_org_member(organization_id))
)
WITH CHECK (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
  OR public.has_org_role(organization_id, 'oficial'::org_role)
  OR (auth.uid() = user_id AND public.is_org_member(organization_id))
);

DROP POLICY IF EXISTS att_select_self_or_admin ON public.emergency_attendance;
CREATE POLICY att_select_self_or_admin ON public.emergency_attendance FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
  OR public.has_org_role(organization_id, 'oficial'::org_role)
  OR public.has_org_role(organization_id, 'operador'::org_role)
  OR (auth.uid() = user_id AND public.is_org_member(organization_id))
);