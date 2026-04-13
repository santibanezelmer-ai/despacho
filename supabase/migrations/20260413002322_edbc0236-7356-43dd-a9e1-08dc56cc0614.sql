CREATE POLICY "ev_delete"
  ON public.emergency_vehicles
  FOR DELETE
  TO authenticated
  USING (is_superadmin() OR can_write_in_org(organization_id));