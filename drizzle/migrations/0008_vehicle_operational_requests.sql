CREATE TABLE public.vehicle_operational_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  emergency_id uuid NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
  emergency_vehicle_id uuid REFERENCES public.emergency_vehicles(id) ON DELETE SET NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.vehicle_devices(id) ON DELETE SET NULL,
  requested_status text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  odometer_end integer,
  status text NOT NULL DEFAULT 'pendiente',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vor_requested_status_chk CHECK (requested_status IN ('6-3','6-8','6-9','6-10')),
  CONSTRAINT vor_status_chk CHECK (status IN ('pendiente','aceptada','rechazada','reemplazada'))
);
CREATE INDEX vor_pending_idx ON public.vehicle_operational_requests (organization_id, status, created_at DESC);

GRANT SELECT, UPDATE ON public.vehicle_operational_requests TO authenticated;
GRANT ALL ON public.vehicle_operational_requests TO service_role;

ALTER TABLE public.vehicle_operational_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view operational requests"
ON public.vehicle_operational_requests FOR SELECT TO authenticated
USING (public.is_superadmin() OR organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "Org writers resolve operational requests"
ON public.vehicle_operational_requests FOR UPDATE TO authenticated
USING (public.can_write_in_org(organization_id))
WITH CHECK (public.can_write_in_org(organization_id));