
CREATE TABLE public.shared_hydrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grifo_id integer,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  ubicacion text,
  modelo text,
  diam_grifo double precision,
  diam_tub double precision,
  anio integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_hydrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_hydrants_select" ON public.shared_hydrants
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_shared_hydrants_coords ON public.shared_hydrants (latitude, longitude);
