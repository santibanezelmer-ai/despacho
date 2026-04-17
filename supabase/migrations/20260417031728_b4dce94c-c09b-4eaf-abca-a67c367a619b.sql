-- Allow org admins to view roles of users in their organization
CREATE POLICY "org_admins_view_member_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  is_org_admin_of_user(user_id)
);