
-- 1. Restrict get_user_roles to auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND _user_id = auth.uid()
$$;

-- 2. Restrict has_role: only allow checking own user, or callers with elevated context (superadmin)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR public.is_superadmin())
  )
$$;

-- 3. notification_log: restrict SELECT to owner + superadmin (drop org-wide access)
DROP POLICY IF EXISTS nl_select ON public.notification_log;
CREATE POLICY nl_select ON public.notification_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_superadmin());

-- 4. audit_log: restrict SELECT to org admins (and superadmin)
DROP POLICY IF EXISTS aud_select ON public.audit_log;
CREATE POLICY aud_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role));

-- 5. Tones storage: switch global app_role check to org-scoped (any admin of any active org)
DROP POLICY IF EXISTS "Admin can upload tones" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete tones" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update tones" ON storage.objects;

CREATE POLICY "Org admins can upload tones" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tones' AND (
      is_superadmin() OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
          AND role = 'admin'::org_role
          AND status = 'active'::org_member_status
      )
    )
  );

CREATE POLICY "Org admins can update tones" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tones' AND (
      is_superadmin() OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
          AND role = 'admin'::org_role
          AND status = 'active'::org_member_status
      )
    )
  );

CREATE POLICY "Org admins can delete tones" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tones' AND (
      is_superadmin() OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
          AND role = 'admin'::org_role
          AND status = 'active'::org_member_status
      )
    )
  );
