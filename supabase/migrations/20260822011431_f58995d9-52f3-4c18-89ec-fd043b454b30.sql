ALTER TABLE public.emergency_vehicles
  ADD COLUMN IF NOT EXISTS volunteer_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.emergency_vehicles
  ADD CONSTRAINT emergency_vehicles_volunteer_count_check CHECK (volunteer_count >= 0 AND volunteer_count <= 99);