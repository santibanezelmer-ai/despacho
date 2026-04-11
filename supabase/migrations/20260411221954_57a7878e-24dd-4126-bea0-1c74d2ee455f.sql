
-- 1. FIX: Audit log forgery — replace permissive insert with SECURITY DEFINER function
DROP POLICY IF EXISTS "aud_insert" ON public.audit_log;

CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _organization_id uuid,
  _action text,
  _table_name text DEFAULT NULL,
  _record_id uuid DEFAULT NULL,
  _old_data jsonb DEFAULT NULL,
  _new_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT is_superadmin() AND NOT is_org_member(_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  INSERT INTO public.audit_log (organization_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (_organization_id, auth.uid(), _action, _table_name, _record_id, _old_data, _new_data)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- 2. FIX: Organization requests — enforce user_id = auth.uid()
DROP POLICY IF EXISTS "req_insert" ON public.organization_requests;

CREATE POLICY "req_insert" ON public.organization_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. FIX: Documents storage bucket — add DELETE and UPDATE policies
CREATE POLICY "Org members can update their documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_my_organization_ids())
);

CREATE POLICY "Org members can delete their documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_my_organization_ids())
);

-- 4. FIX: User roles escalation — restrict org admins to non-admin roles only
DROP POLICY IF EXISTS "org_admins_insert_roles" ON public.user_roles;

CREATE POLICY "org_admins_insert_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_admin_of_user(user_id)
    AND role IN ('operador', 'oficial', 'visor')
  );
