
-- 1. Add company scoping to organization members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS organization_members_company_id_idx ON public.organization_members(company_id);

-- 2. Narrow generic membership checks so company-scoped admins don't get org-wide power.
CREATE OR REPLACE FUNCTION app_private.can_write_in_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND status = 'active'
      AND role IN ('admin','operador','oficial')
      AND company_id IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION app_private.has_org_role(_org_id uuid, _role org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role = _role
      AND status = 'active'
      AND company_id IS NULL
  )
$$;

-- 3. Company admin helper (role='admin' + company_id set == company admin)
CREATE OR REPLACE FUNCTION app_private.is_company_admin(_org_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND status = 'active'
      AND role = 'admin'
      AND company_id = _company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_org_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT app_private.is_company_admin(_org_id, _company_id)
$$;

REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO authenticated;

-- 4. Volunteers policies
DROP POLICY IF EXISTS vol_insert ON public.volunteers;
CREATE POLICY vol_insert ON public.volunteers FOR INSERT
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

DROP POLICY IF EXISTS vol_update ON public.volunteers;
CREATE POLICY vol_update ON public.volunteers FOR UPDATE
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

DROP POLICY IF EXISTS vol_delete ON public.volunteers;
CREATE POLICY vol_delete ON public.volunteers FOR DELETE
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role) OR is_company_admin(organization_id, company_id));

-- 5. Vehicles policies
DROP POLICY IF EXISTS veh_insert ON public.vehicles;
CREATE POLICY veh_insert ON public.vehicles FOR INSERT
WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

DROP POLICY IF EXISTS veh_update ON public.vehicles;
CREATE POLICY veh_update ON public.vehicles FOR UPDATE
USING (is_superadmin() OR can_write_in_org(organization_id) OR is_company_admin(organization_id, company_id));

DROP POLICY IF EXISTS veh_delete ON public.vehicles;
CREATE POLICY veh_delete ON public.vehicles FOR DELETE
USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role) OR is_company_admin(organization_id, company_id));

-- 6. Equipment: scope by parent vehicle's company
DROP POLICY IF EXISTS eq_insert ON public.equipment;
CREATE POLICY eq_insert ON public.equipment FOR INSERT
WITH CHECK (
  is_superadmin() OR can_write_in_org(organization_id)
  OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND is_company_admin(v.organization_id, v.company_id))
);

DROP POLICY IF EXISTS eq_update ON public.equipment;
CREATE POLICY eq_update ON public.equipment FOR UPDATE
USING (
  is_superadmin() OR can_write_in_org(organization_id)
  OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND is_company_admin(v.organization_id, v.company_id))
);

DROP POLICY IF EXISTS eq_delete ON public.equipment;
CREATE POLICY eq_delete ON public.equipment FOR DELETE
USING (
  is_superadmin() OR has_org_role(organization_id, 'admin'::org_role)
  OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND is_company_admin(v.organization_id, v.company_id))
);
