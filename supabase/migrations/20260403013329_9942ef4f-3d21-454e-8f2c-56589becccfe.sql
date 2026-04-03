
-- Add operational fields to emergencies table
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS external_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declared_at timestamptz,
  ADD COLUMN IF NOT EXISTS carabineros_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ambulance_requested boolean NOT NULL DEFAULT false;
