ALTER TABLE public.vehicle_device_codes
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_permanent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_device_codes_one_permanent_per_vehicle
  ON public.vehicle_device_codes (vehicle_id)
  WHERE is_permanent AND revoked_at IS NULL;