ALTER TABLE public.training ADD COLUMN IF NOT EXISTS malla text, ADD COLUMN IF NOT EXISTS anb_course_code text;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS anb_registry text;

CREATE TABLE public.volunteer_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  position text NOT NULL,
  company_name text,
  start_date date,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_positions TO authenticated;
GRANT ALL ON public.volunteer_positions TO service_role;
ALTER TABLE public.volunteer_positions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_volunteer_positions_vol ON public.volunteer_positions(volunteer_id);
CREATE POLICY vpos_select ON public.volunteer_positions FOR SELECT TO authenticated USING (public.is_superadmin() OR organization_id IN (SELECT public.get_my_organization_ids()));
CREATE POLICY vpos_insert ON public.volunteer_positions FOR INSERT TO authenticated WITH CHECK (public.is_superadmin() OR public.can_write_in_org(organization_id));
CREATE POLICY vpos_update ON public.volunteer_positions FOR UPDATE TO authenticated USING (public.is_superadmin() OR public.can_write_in_org(organization_id));
CREATE POLICY vpos_delete ON public.volunteer_positions FOR DELETE TO authenticated USING (public.is_superadmin() OR public.can_write_in_org(organization_id));
CREATE TRIGGER vpos_org_immutable BEFORE UPDATE ON public.volunteer_positions FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id_immutable();