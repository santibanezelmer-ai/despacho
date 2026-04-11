-- Fix: restrict user_roles DELETE to non-admin roles only
DROP POLICY IF EXISTS "org_admins_delete_roles" ON public.user_roles;

CREATE POLICY "org_admins_delete_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    is_org_admin_of_user(user_id)
    AND role IN ('operador', 'oficial', 'visor')
  );