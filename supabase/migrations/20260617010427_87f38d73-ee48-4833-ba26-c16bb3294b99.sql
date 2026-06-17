
-- Fix mutable search_path on pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- Lock down SECURITY DEFINER functions: revoke from anon and PUBLIC.
-- Each still validates auth.uid()/is_superadmin internally; defense in depth.
REVOKE EXECUTE ON FUNCTION public.is_org_admin_of_user(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_write_in_org(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_volunteer(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, text, uuid, jsonb, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.demo_emergency_count(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_demo_org_active(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_organization_ids() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(uuid) FROM anon, PUBLIC;

-- pgmq wrappers: only edge functions (service_role) should call these
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;

-- Trigger-only helpers should never be invokable through the Data API
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_emergency_folio() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Stop public listing of the tones bucket. Files remain accessible by direct
-- public URL (the bucket stays public for browser audio playback), but the
-- storage.objects listing API is now restricted to org members and superadmins
-- via the existing "Org members can read tones in their org folder" policy.
DROP POLICY IF EXISTS "Public can read tones" ON storage.objects;
