-- 1) notification_log: block all direct client writes (edge function uses service role)
CREATE POLICY nl_no_insert ON public.notification_log
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY nl_no_delete ON public.notification_log
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- 2) user_roles: remove org-admin-driven role grants; only superadmins manage app roles
DROP POLICY IF EXISTS org_admins_insert_roles ON public.user_roles;
DROP POLICY IF EXISTS org_admins_delete_roles ON public.user_roles;
DROP POLICY IF EXISTS org_admins_view_member_roles ON public.user_roles;
