ALTER TABLE public.hydrants
  ADD COLUMN hydrant_number text,
  ADD COLUMN status text NOT NULL DEFAULT 'sin_informacion',
  ADD COLUMN outlets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN flow_lpm numeric,
  ADD COLUMN pressure_bar numeric,
  ADD COLUMN last_inspection date,
  ADD COLUMN observations text;

ALTER TABLE public.hydrants
  ADD CONSTRAINT hydrants_status_valid
  CHECK (status IN ('operativo', 'observaciones', 'averiado', 'sin_informacion'));

ALTER TABLE public.hydrants
  ADD CONSTRAINT hydrants_outlets_array
  CHECK (jsonb_typeof(outlets) = 'array');

ALTER TABLE public.hydrants
  ADD CONSTRAINT hydrants_flow_nonnegative
  CHECK (flow_lpm IS NULL OR flow_lpm >= 0);

ALTER TABLE public.hydrants
  ADD CONSTRAINT hydrants_pressure_nonnegative
  CHECK (pressure_bar IS NULL OR pressure_bar >= 0);