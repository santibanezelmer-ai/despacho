-- email_send_state: solo el rol de servicio (fail-closed explícito)
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
GRANT ALL ON public.email_send_state TO service_role;

-- leads: anónimos solo pueden insertar; lectura solo superadmin (por RLS)
REVOKE ALL ON public.leads FROM anon, authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;