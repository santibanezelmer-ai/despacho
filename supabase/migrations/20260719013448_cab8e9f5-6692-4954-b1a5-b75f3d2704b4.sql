
-- 1) Falsa alarma flag on emergencies
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS false_alarm boolean NOT NULL DEFAULT false;

-- 2) Dispatch notes (comunicados de texto)
CREATE TABLE IF NOT EXISTS public.dispatch_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_notes TO authenticated;
GRANT ALL ON public.dispatch_notes TO service_role;

ALTER TABLE public.dispatch_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.dispatch_notes
  FOR SELECT TO authenticated
  USING (public.is_superadmin() OR public.is_org_member(organization_id));

CREATE POLICY "notes_insert" ON public.dispatch_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin() OR public.can_write_in_org(organization_id));

CREATE POLICY "notes_update" ON public.dispatch_notes
  FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR public.can_write_in_org(organization_id));

CREATE POLICY "notes_delete" ON public.dispatch_notes
  FOR DELETE TO authenticated
  USING (public.is_superadmin() OR public.can_write_in_org(organization_id));

CREATE INDEX IF NOT EXISTS idx_dispatch_notes_org ON public.dispatch_notes(organization_id, created_at DESC);

CREATE TRIGGER update_dispatch_notes_updated_at
  BEFORE UPDATE ON public.dispatch_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
