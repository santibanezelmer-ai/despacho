
-- 1. Fix profiles SELECT: restrict to own profile or same-org members
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin()
  OR user_id IN (
    SELECT om2.user_id FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om1.status = 'active' AND om2.status = 'active'
  )
);

-- 2. Fix organization_requests INSERT: prevent user_id spoofing
DROP POLICY IF EXISTS req_insert ON public.organization_requests;
CREATE POLICY req_insert ON public.organization_requests FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3. Fix documents bucket: scope SELECT to org members via path prefix
DROP POLICY IF EXISTS "Authenticated can view documents" ON storage.objects;
CREATE POLICY "org_members_view_documents" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    is_superadmin() OR
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
);
