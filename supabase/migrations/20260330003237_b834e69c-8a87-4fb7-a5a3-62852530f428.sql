-- Allow admin/oficial to delete volunteers
CREATE POLICY "Admin/Oficial can delete volunteers"
ON public.volunteers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'oficial'::app_role));

-- Allow admin/oficial to delete vehicles
CREATE POLICY "Admin/Oficial can delete vehicles"
ON public.vehicles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'oficial'::app_role));

-- Allow admin to delete emergency_keys
CREATE POLICY "Admin can delete emergency keys"
ON public.emergency_keys
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete companies
CREATE POLICY "Admin can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));