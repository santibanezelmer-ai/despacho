
-- Add en_cuartel to emergency_status enum
ALTER TYPE public.emergency_status ADD VALUE IF NOT EXISTS 'en_cuartel' AFTER 'finalizada';

-- Add in_quarters_at timestamp to emergencies
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS in_quarters_at timestamptz;
