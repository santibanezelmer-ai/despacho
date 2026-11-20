CREATE TABLE public.monthly_report_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
 status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','failed')),
 provider_id text,
 error_status integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 UNIQUE (organization_id,recipient_user_id,period)
);
GRANT ALL ON public.monthly_report_deliveries TO service_role;
REVOKE ALL ON public.monthly_report_deliveries FROM anon,authenticated;
ALTER TABLE public.monthly_report_deliveries ENABLE ROW LEVEL SECURITY;