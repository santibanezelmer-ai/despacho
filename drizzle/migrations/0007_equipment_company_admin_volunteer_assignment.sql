DROP POLICY IF EXISTS eq_insert ON public.equipment;
CREATE POLICY eq_insert ON public.equipment FOR INSERT TO authenticated
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id))
  OR (equipment.vehicle_id IS NULL AND EXISTS (
    SELECT 1 FROM volunteers vo WHERE vo.id = equipment.assigned_volunteer_id
      AND vo.organization_id = equipment.organization_id
      AND vo.company_id IS NOT NULL
      AND is_company_admin(vo.organization_id, vo.company_id))));

DROP POLICY IF EXISTS eq_update ON public.equipment;
CREATE POLICY eq_update ON public.equipment FOR UPDATE TO authenticated
  USING (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id))
  OR (equipment.vehicle_id IS NULL AND EXISTS (
    SELECT 1 FROM volunteers vo WHERE vo.id = equipment.assigned_volunteer_id
      AND vo.organization_id = equipment.organization_id
      AND vo.company_id IS NOT NULL
      AND is_company_admin(vo.organization_id, vo.company_id))))
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id))
  OR (equipment.vehicle_id IS NULL AND EXISTS (
    SELECT 1 FROM volunteers vo WHERE vo.id = equipment.assigned_volunteer_id
      AND vo.organization_id = equipment.organization_id
      AND vo.company_id IS NOT NULL
      AND is_company_admin(vo.organization_id, vo.company_id))));