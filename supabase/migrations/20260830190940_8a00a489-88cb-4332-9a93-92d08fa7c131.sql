-- ============ 1. Activation codes ============
CREATE TABLE public.vehicle_device_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  label text,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  used_by_device_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_device_codes TO authenticated;
GRANT ALL ON public.vehicle_device_codes TO service_role;
ALTER TABLE public.vehicle_device_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org admins read device codes" ON public.vehicle_device_codes
  FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id, 'admin') OR public.is_superadmin());
CREATE POLICY "org admins create device codes" ON public.vehicle_device_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, 'admin') AND created_by = auth.uid());
CREATE POLICY "org admins update device codes" ON public.vehicle_device_codes
  FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, 'admin'))
  WITH CHECK (public.has_org_role(organization_id, 'admin'));
CREATE POLICY "org admins delete device codes" ON public.vehicle_device_codes
  FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, 'admin'));

CREATE TRIGGER update_vehicle_device_codes_updated_at
  BEFORE UPDATE ON public.vehicle_device_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. Authorized devices ============
CREATE TABLE public.vehicle_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Dispositivo móvil',
  platform text,
  status text NOT NULL DEFAULT 'active',
  token_hash text NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  vehicle_changed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_devices_status_check CHECK (status IN ('active', 'revoked'))
);

CREATE UNIQUE INDEX vehicle_devices_token_hash_key ON public.vehicle_devices(token_hash);
CREATE INDEX vehicle_devices_org_idx ON public.vehicle_devices(organization_id);
CREATE INDEX vehicle_devices_vehicle_idx ON public.vehicle_devices(vehicle_id);

ALTER TABLE public.vehicle_device_codes
  ADD CONSTRAINT vehicle_device_codes_device_fk
  FOREIGN KEY (used_by_device_id) REFERENCES public.vehicle_devices(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_devices TO authenticated;
GRANT ALL ON public.vehicle_devices TO service_role;
ALTER TABLE public.vehicle_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read devices" ON public.vehicle_devices
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_superadmin());
CREATE POLICY "org admins insert devices" ON public.vehicle_devices
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, 'admin'));
CREATE POLICY "org admins update devices" ON public.vehicle_devices
  FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, 'admin'))
  WITH CHECK (public.has_org_role(organization_id, 'admin'));
CREATE POLICY "org admins delete devices" ON public.vehicle_devices
  FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, 'admin'));

CREATE TRIGGER update_vehicle_devices_updated_at
  BEFORE UPDATE ON public.vehicle_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Impide mover un dispositivo a otra organización o a un móvil de otra organización
CREATE OR REPLACE FUNCTION public.vehicle_devices_enforce_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id cannot be changed on vehicle_devices';
  END IF;
  IF NEW.vehicle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = NEW.vehicle_id AND v.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'vehicle must belong to the same organization';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_devices_scope_trg
  BEFORE INSERT OR UPDATE ON public.vehicle_devices
  FOR EACH ROW EXECUTE FUNCTION public.vehicle_devices_enforce_scope();

-- ============ 3. GPS positions ============
CREATE TABLE public.vehicle_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.vehicle_devices(id) ON DELETE SET NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  emergency_id uuid REFERENCES public.emergencies(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_positions_vehicle_captured_idx
  ON public.vehicle_positions(vehicle_id, captured_at DESC);
CREATE INDEX vehicle_positions_org_idx ON public.vehicle_positions(organization_id);
CREATE INDEX vehicle_positions_emergency_idx ON public.vehicle_positions(emergency_id);

GRANT SELECT ON public.vehicle_positions TO authenticated;
GRANT ALL ON public.vehicle_positions TO service_role;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read vehicle positions" ON public.vehicle_positions
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_superadmin());

-- ============ 4. Last known position per vehicle ============
CREATE TABLE public.vehicle_last_positions (
  vehicle_id uuid NOT NULL PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.vehicle_devices(id) ON DELETE SET NULL,
  emergency_id uuid REFERENCES public.emergencies(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  captured_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_last_positions_org_idx ON public.vehicle_last_positions(organization_id);

GRANT SELECT ON public.vehicle_last_positions TO authenticated;
GRANT ALL ON public.vehicle_last_positions TO service_role;
ALTER TABLE public.vehicle_last_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read last positions" ON public.vehicle_last_positions
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_superadmin());

CREATE OR REPLACE FUNCTION public.vehicle_positions_sync_last()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vehicle_last_positions AS l (
    vehicle_id, organization_id, device_id, emergency_id,
    latitude, longitude, accuracy, speed, heading, captured_at, updated_at
  ) VALUES (
    NEW.vehicle_id, NEW.organization_id, NEW.device_id, NEW.emergency_id,
    NEW.latitude, NEW.longitude, NEW.accuracy, NEW.speed, NEW.heading, NEW.captured_at, now()
  )
  ON CONFLICT (vehicle_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    device_id = EXCLUDED.device_id,
    emergency_id = EXCLUDED.emergency_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy = EXCLUDED.accuracy,
    speed = EXCLUDED.speed,
    heading = EXCLUDED.heading,
    captured_at = EXCLUDED.captured_at,
    updated_at = now()
  WHERE EXCLUDED.captured_at >= l.captured_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_positions_sync_last_trg
  AFTER INSERT ON public.vehicle_positions
  FOR EACH ROW EXECUTE FUNCTION public.vehicle_positions_sync_last();