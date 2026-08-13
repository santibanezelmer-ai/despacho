-- El invitado no necesita leer la tabla: usa get_invitation_preview()/accept_invitation()
DROP POLICY IF EXISTS "invitees_read_own" ON public.organization_invitations;

-- Sin acceso anónimo a la tabla de invitaciones
REVOKE ALL ON public.organization_invitations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;