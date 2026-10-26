CREATE TABLE public.radio_glossary_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX radio_glossary_keys_org_idx ON public.radio_glossary_keys(organization_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radio_glossary_keys TO authenticated;
GRANT ALL ON public.radio_glossary_keys TO service_role;
ALTER TABLE public.radio_glossary_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read radio glossary" ON public.radio_glossary_keys FOR SELECT TO authenticated
  USING (public.is_superadmin() OR public.is_org_member(organization_id));
CREATE POLICY "Admins insert radio glossary" ON public.radio_glossary_keys FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin() OR public.has_org_role(organization_id, 'admin'));
CREATE POLICY "Admins update radio glossary" ON public.radio_glossary_keys FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR public.has_org_role(organization_id, 'admin'))
  WITH CHECK (public.is_superadmin() OR public.has_org_role(organization_id, 'admin'));
CREATE POLICY "Admins delete radio glossary" ON public.radio_glossary_keys FOR DELETE TO authenticated
  USING (public.is_superadmin() OR public.has_org_role(organization_id, 'admin'));
CREATE TRIGGER radio_glossary_keys_updated_at BEFORE UPDATE ON public.radio_glossary_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();