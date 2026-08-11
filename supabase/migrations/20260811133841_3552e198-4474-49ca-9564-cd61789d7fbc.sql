-- 1) Restrict write policies on equipment, vehicles, volunteers to authenticated role
DROP POLICY IF EXISTS eq_insert ON public.equipment;
DROP POLICY IF EXISTS eq_update ON public.equipment;
DROP POLICY IF EXISTS eq_delete ON public.equipment;

CREATE POLICY eq_insert ON public.equipment FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM public.vehicles v WHERE v.id = equipment.vehicle_id AND is_company_admin(v.organization_id, v.company_id)
  )
);

CREATE POLICY eq_update ON public.equipment FOR UPDATE TO authenticated
USING (
  is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM public.vehicles v WHERE v.id = equipment.vehicle_id AND is_company_admin(v.organization_id, v.company_id)
  )
);

CREATE POLICY eq_delete ON public.equipment FOR DELETE TO authenticated
USING (
  is_superadmin() OR has_org_role(organization_id, 'admin'::org_role) OR EXISTS (
    SELECT 1 FROM public.vehicles v WHERE v.id = equipment.vehicle_id AND is_company_admin(v.organization_id, v.company_id)
  )
);

DROP POLICY IF EXISTS veh_insert ON public.vehicles;
DROP POLICY IF EXISTS veh_update ON public.vehicles;
DROP POLICY IF EXISTS veh_delete ON public.vehicles;

CREATE POLICY veh_insert ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

CREATE POLICY veh_update ON public.vehicles FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

CREATE POLICY veh_delete ON public.vehicles FOR DELETE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role) OR is_company_admin(organization_id, company_id));

DROP POLICY IF EXISTS vol_insert ON public.volunteers;
DROP POLICY IF EXISTS vol_update ON public.volunteers;
DROP POLICY IF EXISTS vol_delete ON public.volunteers;

CREATE POLICY vol_insert ON public.volunteers FOR INSERT TO authenticated
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

CREATE POLICY vol_update ON public.volunteers FOR UPDATE TO authenticated
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

CREATE POLICY vol_delete ON public.volunteers FOR DELETE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role) OR is_company_admin(organization_id, company_id));

-- 2) Allow org admins/officers to correct or remove attendance records in their org
DROP POLICY IF EXISTS att_update_self ON public.emergency_attendance;
DROP POLICY IF EXISTS att_delete_self ON public.emergency_attendance;

CREATE POLICY att_update_self_or_admin ON public.emergency_attendance FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR is_superadmin()
  OR has_org_role(organization_id, 'admin'::org_role)
  OR has_org_role(organization_id, 'oficial'::org_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR is_superadmin()
  OR has_org_role(organization_id, 'admin'::org_role)
  OR has_org_role(organization_id, 'oficial'::org_role)
);

CREATE POLICY att_delete_self_or_admin ON public.emergency_attendance FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR is_superadmin()
  OR has_org_role(organization_id, 'admin'::org_role)
  OR has_org_role(organization_id, 'oficial'::org_role)
);

-- 3) Remove the SECURITY DEFINER surface for demo limits: use column-scoped read access instead
CREATE OR REPLACE FUNCTION public.get_demo_limits()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'duration_days', duration_days,
    'max_emergencies', max_emergencies,
    'enabled', enabled
  )
  FROM public.demo_settings
  LIMIT 1
$function$;

REVOKE SELECT ON public.demo_settings FROM authenticated;
GRANT SELECT (duration_days, max_emergencies, enabled) ON public.demo_settings TO authenticated;

DROP POLICY IF EXISTS ds_select ON public.demo_settings;
CREATE POLICY ds_select ON public.demo_settings FOR SELECT TO authenticated USING (true);