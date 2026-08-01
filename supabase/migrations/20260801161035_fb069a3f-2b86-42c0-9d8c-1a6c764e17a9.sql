-- 1) location_pings: server-only writes
REVOKE INSERT, UPDATE, DELETE ON public.location_pings FROM anon, authenticated;
GRANT SELECT ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;

-- 2) service-only email tables: restrict policies to service_role grantee
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read send log" ON public.email_send_log
  FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update send log" ON public.email_send_log
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens
  FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails
  FOR SELECT TO service_role USING (true);

REVOKE ALL ON public.email_send_log FROM anon, authenticated;
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_send_state TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;

-- 3) legacy root tones: exact suffix match instead of LIKE pattern matching
DROP POLICY IF EXISTS "Org members can read legacy root tones" ON storage.objects;
CREATE POLICY "Org members can read legacy root tones" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tones'
    AND (storage.foldername(name))[1] IS NULL
    AND (
      public.is_superadmin()
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE right(c.tone_url, length('/tones/' || storage.objects.name)) = '/tones/' || storage.objects.name
          AND public.is_org_member(c.organization_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.emergency_keys k
        WHERE right(k.tone_url, length('/tones/' || storage.objects.name)) = '/tones/' || storage.objects.name
          AND public.is_org_member(k.organization_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.system_sounds s
        WHERE right(s.sound_url, length('/tones/' || storage.objects.name)) = '/tones/' || storage.objects.name
          AND public.is_org_member(s.organization_id)
      )
    )
  );