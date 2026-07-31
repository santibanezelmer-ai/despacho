CREATE POLICY "Org members can read legacy root tones"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tones'
  AND (storage.foldername(name))[1] IS NULL
  AND (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.tone_url LIKE '%/tones/' || objects.name
        AND public.is_org_member(c.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.emergency_keys k
      WHERE k.tone_url LIKE '%/tones/' || objects.name
        AND public.is_org_member(k.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.system_sounds s
      WHERE s.sound_url LIKE '%/tones/' || objects.name
        AND public.is_org_member(s.organization_id)
    )
  )
);