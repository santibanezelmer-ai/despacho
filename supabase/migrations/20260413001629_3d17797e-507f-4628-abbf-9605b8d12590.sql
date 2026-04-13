
-- 1. Invitation self-read: let invitees see their own invitation by email
CREATE POLICY "invitees_read_own"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- 2. Tones bucket: add UPDATE policy for admins only
CREATE POLICY "Admin can update tones"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tones' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Organization requests: let users delete their own pending requests
CREATE POLICY "req_delete_own"
  ON public.organization_requests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- 4. Documents bucket: fix INSERT to verify org membership
DROP POLICY IF EXISTS "Operador+ can upload documents" ON storage.objects;
CREATE POLICY "Operador+ can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT get_my_organization_ids())
    AND (can_write_in_org(((storage.foldername(name))[1])::uuid) OR is_superadmin())
  );
