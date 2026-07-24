
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Storage policies for logos bucket (folder = organization_id)
DROP POLICY IF EXISTS "Org members can read logos in their org folder" ON storage.objects;
CREATE POLICY "Org members can read logos in their org folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'logos'
    AND (
      is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND is_org_member(((storage.foldername(name))[1])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS "Org admins can upload logos in their org folder" ON storage.objects;
CREATE POLICY "Org admins can upload logos in their org folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (
      is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );

DROP POLICY IF EXISTS "Org admins can update logos in their org folder" ON storage.objects;
CREATE POLICY "Org admins can update logos in their org folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (
      is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );

DROP POLICY IF EXISTS "Org admins can delete logos in their org folder" ON storage.objects;
CREATE POLICY "Org admins can delete logos in their org folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (
      is_superadmin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND has_org_role(((storage.foldername(name))[1])::uuid, 'admin'::org_role)
      )
    )
  );
