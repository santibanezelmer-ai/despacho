-- 1) Mirror USING into WITH CHECK for UPDATE policies

DROP POLICY IF EXISTS comp_update ON public.companies;
CREATE POLICY comp_update ON public.companies FOR UPDATE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role));

DROP POLICY IF EXISTS emg_update ON public.emergencies;
CREATE POLICY emg_update ON public.emergencies FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));

DROP POLICY IF EXISTS ep_update ON public.emergency_personnel;
CREATE POLICY ep_update ON public.emergency_personnel FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));

DROP POLICY IF EXISTS ev_update ON public.emergency_vehicles;
CREATE POLICY ev_update ON public.emergency_vehicles FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));

DROP POLICY IF EXISTS eq_update ON public.equipment;
CREATE POLICY eq_update ON public.equipment FOR UPDATE TO authenticated
USING (
  is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = equipment.vehicle_id AND is_company_admin(v.organization_id, v.company_id)
  )
)
WITH CHECK (
  is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = equipment.vehicle_id AND is_company_admin(v.organization_id, v.company_id)
  )
);

DROP POLICY IF EXISTS hyd_update ON public.hydrants;
CREATE POLICY hyd_update ON public.hydrants FOR UPDATE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role));

DROP POLICY IF EXISTS rank_update ON public.ranks;
CREATE POLICY rank_update ON public.ranks FOR UPDATE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role));

DROP POLICY IF EXISTS ss_update ON public.system_sounds;
CREATE POLICY ss_update ON public.system_sounds FOR UPDATE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role));

DROP POLICY IF EXISTS trn_update ON public.training;
CREATE POLICY trn_update ON public.training FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));

DROP POLICY IF EXISTS veh_update ON public.vehicles;
CREATE POLICY veh_update ON public.vehicles FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id))
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

-- 2) Pin organization_id: it can never change on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_organization_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id is immutable on %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','emergencies','emergency_personnel','emergency_vehicles',
    'equipment','hydrants','ranks','system_sounds','training',
    'vehicle_device_codes','vehicles','volunteers'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_org_immutable ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_org_immutable BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id_immutable()',
      t, t
    );
  END LOOP;
END $$;