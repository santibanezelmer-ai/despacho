-- 1) Tones bucket: scope per organization (folder = org_id) + remove broad listing
-- Drop the policies created in the previous migration
DROP POLICY IF EXISTS "Org admins can upload tones" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update tones" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete tones" ON storage.objects;
DROP POLICY IF EXISTS "Public can read tones" ON storage.objects;
DROP POLICY IF EXISTS "Tones are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tones" ON storage.objects;

-- Make tones bucket private (signed URLs / authenticated reads only)
UPDATE storage.buckets SET public = false WHERE id = 'tones';

-- Read: only org members can read tones in their own org folder; superadmins always
CREATE POLICY "Org members can read tones in their org folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tones' AND (
      public.is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.is_org_member(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- Write: only org admins of the SAME org folder
CREATE POLICY "Org admins can upload tones in their org folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tones' AND (
      public.is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );

CREATE POLICY "Org admins can update tones in their org folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tones' AND (
      public.is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );

CREATE POLICY "Org admins can delete tones in their org folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tones' AND (
      public.is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );

-- 2) audit_log: explicit restrictive write protection — block all direct writes.
-- Inserts must go through SECURITY DEFINER public.insert_audit_log().
CREATE POLICY aud_no_insert ON public.audit_log
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY aud_no_update ON public.audit_log
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY aud_no_delete ON public.audit_log
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);
