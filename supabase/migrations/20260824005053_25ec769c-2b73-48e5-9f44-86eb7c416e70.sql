DROP POLICY IF EXISTS vol_update ON public.volunteers;
CREATE POLICY vol_update ON public.volunteers FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));