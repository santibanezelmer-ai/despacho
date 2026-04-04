
-- Create a security definer function to check if a user is an org admin
-- who shares an organization with a target user
CREATE OR REPLACE FUNCTION public.is_org_admin_of_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om1
    JOIN public.organization_members om2
      ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
      AND om1.role = 'admin'
      AND om1.status = 'active'
      AND om2.user_id = _target_user_id
      AND om2.status = 'active'
  )
$$;

-- Allow org admins to insert roles for users in their organization
CREATE POLICY "org_admins_insert_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_admin_of_user(user_id)
);

-- Allow org admins to delete roles for users in their organization
CREATE POLICY "org_admins_delete_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_org_admin_of_user(user_id)
);
