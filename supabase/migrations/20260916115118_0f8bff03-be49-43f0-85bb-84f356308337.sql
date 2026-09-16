CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_emergency ON public.emergency_vehicles (emergency_id);
CREATE INDEX IF NOT EXISTS idx_emergency_personnel_emergency ON public.emergency_personnel (emergency_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_captured_at ON public.vehicle_positions (captured_at);

CREATE OR REPLACE FUNCTION public.purge_old_vehicle_positions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.vehicle_positions
  WHERE captured_at < now() - interval '7 days';
$$;

REVOKE ALL ON FUNCTION public.purge_old_vehicle_positions() FROM public, anon, authenticated;

SELECT cron.schedule(
  'purge-vehicle-positions-daily',
  '17 4 * * *',
  $$SELECT public.purge_old_vehicle_positions();$$
);