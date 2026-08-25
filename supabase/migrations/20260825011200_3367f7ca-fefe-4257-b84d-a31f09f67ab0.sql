ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS join_date date;

ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS assigned_volunteer_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.equipment ALTER COLUMN vehicle_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS equipment_assigned_volunteer_idx ON public.equipment(assigned_volunteer_id);

CREATE TABLE IF NOT EXISTS public.volunteer_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT current_date,
  record_type text NOT NULL DEFAULT 'observacion',
  title text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_records TO authenticated;
GRANT ALL ON public.volunteer_records TO service_role;

ALTER TABLE public.volunteer_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vrec_select" ON public.volunteer_records FOR SELECT TO authenticated
USING (public.is_superadmin() OR organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "vrec_insert" ON public.volunteer_records FOR INSERT TO authenticated
WITH CHECK (
  public.is_superadmin()
  OR public.can_write_in_org(organization_id)
  OR EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id = volunteer_id AND v.organization_id = volunteer_records.organization_id AND public.is_company_admin(v.organization_id, v.company_id))
);

CREATE POLICY "vrec_update" ON public.volunteer_records FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR public.can_write_in_org(organization_id)
  OR EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id = volunteer_id AND public.is_company_admin(v.organization_id, v.company_id))
)
WITH CHECK (
  public.is_superadmin()
  OR public.can_write_in_org(organization_id)
  OR EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id = volunteer_id AND v.organization_id = volunteer_records.organization_id AND public.is_company_admin(v.organization_id, v.company_id))
);

CREATE POLICY "vrec_delete" ON public.volunteer_records FOR DELETE TO authenticated
USING (
  public.is_superadmin()
  OR public.has_org_role(organization_id, 'admin'::org_role)
  OR EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id = volunteer_id AND public.is_company_admin(v.organization_id, v.company_id))
);

CREATE TRIGGER update_volunteer_records_updated_at BEFORE UPDATE ON public.volunteer_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS volunteer_records_volunteer_idx ON public.volunteer_records(volunteer_id, record_date DESC);