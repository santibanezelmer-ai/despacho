GRANT SELECT ON public.hydrants TO authenticated;
ALTER POLICY hyd_select ON public.hydrants TO authenticated
USING (public.is_superadmin() OR EXISTS (SELECT 1 FROM public.get_my_organization_ids()));
COMMENT ON TABLE public.hydrants IS 'Organization-contributed hydrants shared for reading by authenticated organization members. Existing owner-scoped write policies remain unchanged.';