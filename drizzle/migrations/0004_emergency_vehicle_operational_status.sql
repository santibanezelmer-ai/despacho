ALTER TABLE public.emergency_vehicles
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'despachado',
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS on_scene_at timestamptz,
  ADD COLUMN IF NOT EXISTS controlled_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawing_at timestamptz;

ALTER TABLE public.emergency_vehicles
  DROP CONSTRAINT IF EXISTS emergency_vehicles_operational_status_check;

ALTER TABLE public.emergency_vehicles
  ADD CONSTRAINT emergency_vehicles_operational_status_check
  CHECK (operational_status IN ('despachado','en_lugar','controlada','retirandose','en_cuartel'));

UPDATE public.emergency_vehicles
  SET operational_status = 'en_cuartel'
  WHERE released_at IS NOT NULL AND operational_status = 'despachado';

CREATE INDEX IF NOT EXISTS idx_emergency_vehicles_op_status
  ON public.emergency_vehicles (emergency_id, operational_status);