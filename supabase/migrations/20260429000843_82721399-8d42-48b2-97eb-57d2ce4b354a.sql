UPDATE storage.buckets SET public = true WHERE id = 'tones';

-- Allow public read of tones, keep writes restricted to authenticated users
DROP POLICY IF EXISTS "Public can read tones" ON storage.objects;
CREATE POLICY "Public can read tones"
ON storage.objects FOR SELECT
USING (bucket_id = 'tones');

DROP POLICY IF EXISTS "Authenticated can upload tones" ON storage.objects;
CREATE POLICY "Authenticated can upload tones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tones');

DROP POLICY IF EXISTS "Authenticated can update tones" ON storage.objects;
CREATE POLICY "Authenticated can update tones"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tones');

DROP POLICY IF EXISTS "Authenticated can delete tones" ON storage.objects;
CREATE POLICY "Authenticated can delete tones"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tones');