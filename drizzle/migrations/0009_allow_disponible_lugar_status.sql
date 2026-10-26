-- 6-8 (Disponible en el lugar) was added to the console and mobile flows but the
-- column CHECK still only allows the original five codes, so every 6-8 update
-- fails. Widen the constraint; existing values are a strict subset.
ALTER TABLE public.emergency_vehicles
  DROP CONSTRAINT IF EXISTS emergency_vehicles_operational_status_check;

ALTER TABLE public.emergency_vehicles
  ADD CONSTRAINT emergency_vehicles_operational_status_check
  CHECK (operational_status IN ('despachado','en_lugar','controlada','disponible_lugar','retirandose','en_cuartel'));