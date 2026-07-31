CREATE TABLE public.location_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  emergency_id uuid REFERENCES public.emergencies(id) ON DELETE SET NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  phone text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  resolved_address text,
  last_ping_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_requests TO authenticated;
GRANT ALL ON public.location_requests TO service_role;
ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view location requests"
ON public.location_requests FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "org writers create location requests"
ON public.location_requests FOR INSERT TO authenticated
WITH CHECK (public.can_write_in_org(organization_id));

CREATE POLICY "org writers update location requests"
ON public.location_requests FOR UPDATE TO authenticated
USING (public.can_write_in_org(organization_id))
WITH CHECK (public.can_write_in_org(organization_id));

CREATE POLICY "org writers delete location requests"
ON public.location_requests FOR DELETE TO authenticated
USING (public.can_write_in_org(organization_id));

CREATE INDEX idx_location_requests_token ON public.location_requests(token);
CREATE INDEX idx_location_requests_emergency ON public.location_requests(emergency_id);

CREATE TRIGGER update_location_requests_updated_at
BEFORE UPDATE ON public.location_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.location_pings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.location_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  emergency_id uuid REFERENCES public.emergencies(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  battery_level double precision,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;
ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view location pings"
ON public.location_pings FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE INDEX idx_location_pings_request ON public.location_pings(request_id, captured_at DESC);
CREATE INDEX idx_location_pings_emergency ON public.location_pings(emergency_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.location_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;