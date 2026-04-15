
-- Notification tracking table
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  emergency_id uuid NOT NULL REFERENCES public.emergencies(id),
  user_id uuid NOT NULL,
  device_token text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'opened')),
  error_message text,
  opened_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_org ON public.notification_log(organization_id);
CREATE INDEX idx_notification_log_emergency ON public.notification_log(emergency_id);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's logs
CREATE POLICY "nl_select" ON public.notification_log
  FOR SELECT TO authenticated
  USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));

-- Authenticated users can update their own rows (to mark opened)
CREATE POLICY "nl_update_opened" ON public.notification_log
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
