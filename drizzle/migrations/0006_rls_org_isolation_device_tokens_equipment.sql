DROP POLICY IF EXISTS dt_insert ON public.device_tokens;
CREATE POLICY dt_insert ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_org_member(organization_id));

DROP POLICY IF EXISTS dt_update ON public.device_tokens;
CREATE POLICY dt_update ON public.device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_org_member(organization_id));

DROP POLICY IF EXISTS eq_insert ON public.equipment;
CREATE POLICY eq_insert ON public.equipment FOR INSERT TO authenticated
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));

DROP POLICY IF EXISTS eq_update ON public.equipment;
CREATE POLICY eq_update ON public.equipment FOR UPDATE TO authenticated
  USING (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)))
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));

DROP POLICY IF EXISTS eq_delete ON public.equipment;
CREATE POLICY eq_delete ON public.equipment FOR DELETE TO authenticated
  USING (is_superadmin() OR has_org_role(organization_id, 'admin') OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));