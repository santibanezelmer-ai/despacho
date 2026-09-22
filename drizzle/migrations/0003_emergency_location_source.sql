ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS location_source TEXT,
  ADD COLUMN IF NOT EXISTS location_shared_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_shared_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_source_updated_by UUID;

COMMENT ON COLUMN public.emergencies.location_source IS 'Origen de la ubicacion vigente: compartida | operador (NULL = sin definir)';