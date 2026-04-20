-- 1) notification_log: restrict UPDATE so only opened_at can change
DROP POLICY IF EXISTS nl_update_opened ON public.notification_log;

CREATE POLICY nl_update_opened ON public.notification_log
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Lock all other columns: any changed field other than opened_at is rejected
    AND device_token   = (SELECT nl.device_token   FROM public.notification_log nl WHERE nl.id = notification_log.id)
    AND status         = (SELECT nl.status         FROM public.notification_log nl WHERE nl.id = notification_log.id)
    AND emergency_id   = (SELECT nl.emergency_id   FROM public.notification_log nl WHERE nl.id = notification_log.id)
    AND organization_id= (SELECT nl.organization_id FROM public.notification_log nl WHERE nl.id = notification_log.id)
    AND COALESCE(error_message,'') = COALESCE((SELECT nl.error_message FROM public.notification_log nl WHERE nl.id = notification_log.id),'')
  );

-- 2) organization_members: restrict role to allowed enum values on insert/update
DROP POLICY IF EXISTS om_insert ON public.organization_members;
CREATE POLICY om_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
    AND role = ANY (ARRAY['admin'::org_role, 'operador'::org_role, 'oficial'::org_role, 'visor'::org_role])
  );

DROP POLICY IF EXISTS om_update ON public.organization_members;
CREATE POLICY om_update ON public.organization_members
  FOR UPDATE TO authenticated
  USING (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
  WITH CHECK (
    (is_superadmin() OR has_org_role(organization_id, 'admin'::org_role))
    AND role = ANY (ARRAY['admin'::org_role, 'operador'::org_role, 'oficial'::org_role, 'visor'::org_role])
  );
