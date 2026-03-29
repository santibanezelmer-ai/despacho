
-- Fix: restrict audit_log inserts to users who are logged in (auth.uid() is not null)
DROP POLICY "System can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
