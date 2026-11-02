CREATE TABLE public.operational_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'sector' CHECK (kind IN ('sector','cuadrante')),
  name text NOT NULL,
  code text,
  color text NOT NULL DEFAULT '#22d3ee',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  polygons jsonb NOT NULL,
  source text NOT NULL DEFAULT 'dibujo',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_sectors TO authenticated;
GRANT ALL ON public.operational_sectors TO service_role;
ALTER TABLE public.operational_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sectors" ON public.operational_sectors FOR SELECT TO authenticated USING (is_org_member(organization_id) OR is_superadmin());
CREATE POLICY "Writers insert sectors" ON public.operational_sectors FOR INSERT TO authenticated WITH CHECK (can_write_in_org(organization_id));
CREATE POLICY "Writers update sectors" ON public.operational_sectors FOR UPDATE TO authenticated USING (can_write_in_org(organization_id)) WITH CHECK (can_write_in_org(organization_id));
CREATE POLICY "Writers delete sectors" ON public.operational_sectors FOR DELETE TO authenticated USING (can_write_in_org(organization_id));
CREATE INDEX operational_sectors_org_idx ON public.operational_sectors(organization_id);
CREATE TRIGGER operational_sectors_updated BEFORE UPDATE ON public.operational_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER operational_sectors_org_immutable BEFORE UPDATE ON public.operational_sectors FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id_immutable();