-- Allow admins to delete profiles (for user removal)
CREATE POLICY "Admin can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user_roles
CREATE POLICY "Admin can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));