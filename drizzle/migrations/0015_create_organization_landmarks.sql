CREATE TABLE public.organization_landmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  category text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_landmarks_org_idx ON public.organization_landmarks(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_landmarks TO authenticated;
GRANT ALL ON public.organization_landmarks TO service_role;
ALTER TABLE public.organization_landmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read landmarks" ON public.organization_landmarks FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_superadmin());
CREATE POLICY "Writers insert landmarks" ON public.organization_landmarks FOR INSERT TO authenticated WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "Writers update landmarks" ON public.organization_landmarks FOR UPDATE TO authenticated USING (public.can_write_in_org(organization_id)) WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "Writers delete landmarks" ON public.organization_landmarks FOR DELETE TO authenticated USING (public.can_write_in_org(organization_id));
CREATE TRIGGER trg_org_landmarks_org_immutable BEFORE UPDATE ON public.organization_landmarks FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id_immutable();
CREATE TRIGGER update_org_landmarks_updated_at BEFORE UPDATE ON public.organization_landmarks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();