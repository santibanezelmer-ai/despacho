-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Org members can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete their documents" ON storage.objects;

-- Recreate with role restriction matching INSERT policy
CREATE POLICY "Org writers can update their documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_my_organization_ids())
  AND (
    can_write_in_org((storage.foldername(name))[1]::uuid)
    OR is_superadmin()
  )
);

CREATE POLICY "Org writers can delete their documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_my_organization_ids())
  AND (
    can_write_in_org((storage.foldername(name))[1]::uuid)
    OR is_superadmin()
  )
);