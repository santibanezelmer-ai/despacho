CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  had_errors boolean NOT NULL DEFAULT false,
  comments text CHECK (comments IS NULL OR char_length(comments) <= 5000),
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_feedback_insert_own" ON public.app_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (organization_id IS NULL OR public.is_org_member(organization_id)));
CREATE POLICY "app_feedback_select_own_or_superadmin" ON public.app_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());
CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx ON public.app_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS app_feedback_user_idx ON public.app_feedback (user_id);
CREATE INDEX IF NOT EXISTS app_feedback_org_idx ON public.app_feedback (organization_id);