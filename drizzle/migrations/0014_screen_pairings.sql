CREATE TABLE public.screen_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text NOT NULL,
  secret_hash text NOT NULL UNIQUE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text,
  view text NOT NULL DEFAULT 'central' CHECK (view IN ('central','mapa','emergencias')),
  paired_by uuid,
  paired_at timestamptz,
  pin_expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX screen_pairings_pending_pin ON public.screen_pairings (pin) WHERE organization_id IS NULL;
CREATE INDEX screen_pairings_org ON public.screen_pairings (organization_id);
GRANT SELECT, UPDATE, DELETE ON public.screen_pairings TO authenticated;
GRANT ALL ON public.screen_pairings TO service_role;
ALTER TABLE public.screen_pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org staff view screens" ON public.screen_pairings FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id) AND NOT public.has_org_role(organization_id, 'voluntario'));
CREATE POLICY "Org staff update screens" ON public.screen_pairings FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id) AND NOT public.has_org_role(organization_id, 'voluntario'))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_member(organization_id));
CREATE POLICY "Org staff delete screens" ON public.screen_pairings FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id) AND NOT public.has_org_role(organization_id, 'voluntario'));