
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pwa_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS volunteers_user_id_key ON public.volunteers(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.emergency_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id uuid NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going','not_going')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (emergency_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_attendance TO authenticated;
GRANT ALL ON public.emergency_attendance TO service_role;
ALTER TABLE public.emergency_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select_self_or_admin" ON public.emergency_attendance FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR auth.uid() = user_id
  OR has_org_role(organization_id, 'admin'::org_role)
  OR has_org_role(organization_id, 'oficial'::org_role)
  OR has_org_role(organization_id, 'operador'::org_role)
);

CREATE POLICY "att_insert_self" ON public.emergency_attendance FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_org_member(organization_id));

CREATE POLICY "att_update_self" ON public.emergency_attendance FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "att_delete_self" ON public.emergency_attendance FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_emergency_attendance_updated
BEFORE UPDATE ON public.emergency_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _inv record; _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión para aceptar la invitación'; END IF;
  SELECT * INTO _inv FROM public.organization_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitación no encontrada'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Esta invitación ya fue %', _inv.status; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'La invitación expiró';
  END IF;
  _user_email := lower(auth.jwt() ->> 'email');
  IF _user_email IS DISTINCT FROM lower(_inv.email) THEN
    RAISE EXCEPTION 'Esta invitación es para % y tu sesión es %', _inv.email, _user_email;
  END IF;
  INSERT INTO public.organization_members (user_id, organization_id, role, status, invited_by)
  VALUES (auth.uid(), _inv.organization_id, _inv.role, 'active', _inv.invited_by)
  ON CONFLICT DO NOTHING;
  IF _inv.role = 'voluntario'::org_role THEN
    UPDATE public.volunteers
    SET user_id = auth.uid()
    WHERE organization_id = _inv.organization_id
      AND lower(email) = lower(_inv.email)
      AND user_id IS NULL;
  END IF;
  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = now() WHERE id = _inv.id;
  RETURN jsonb_build_object('organization_id', _inv.organization_id, 'role', _inv.role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_volunteer(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id
      AND role = 'voluntario'::org_role AND status = 'active')
$$;
