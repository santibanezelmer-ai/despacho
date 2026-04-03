
CREATE TABLE public.system_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sound_key text NOT NULL,
  sound_url text NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, sound_key)
);

ALTER TABLE public.system_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY ss_select ON public.system_sounds FOR SELECT TO authenticated
USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));

CREATE POLICY ss_insert ON public.system_sounds FOR INSERT TO authenticated
WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));

CREATE POLICY ss_update ON public.system_sounds FOR UPDATE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

CREATE POLICY ss_delete ON public.system_sounds FOR DELETE TO authenticated
USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
