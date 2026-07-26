
-- 1) notification_log: enforce field-level immutability via trigger; only opened_at may change
CREATE OR REPLACE FUNCTION public.notification_log_enforce_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.emergency_id IS DISTINCT FROM OLD.emergency_id
     OR NEW.device_token IS DISTINCT FROM OLD.device_token
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.error_message IS DISTINCT FROM OLD.error_message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only opened_at can be updated on notification_log';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_log_immutable_trg ON public.notification_log;
CREATE TRIGGER notification_log_immutable_trg
BEFORE UPDATE ON public.notification_log
FOR EACH ROW EXECUTE FUNCTION public.notification_log_enforce_immutable();

-- Simplify the WITH CHECK now that the trigger enforces immutability
DROP POLICY IF EXISTS nl_update_opened ON public.notification_log;
CREATE POLICY nl_update_opened ON public.notification_log
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) shared_hydrants: restrict access to authenticated users only (national dataset shared across orgs by design)
DROP POLICY IF EXISTS shared_hydrants_select ON public.shared_hydrants;
CREATE POLICY shared_hydrants_select ON public.shared_hydrants
FOR SELECT TO authenticated
USING (active = true);

REVOKE SELECT ON public.shared_hydrants FROM anon;
