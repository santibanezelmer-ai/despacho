ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '24';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_time_format_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_time_format_check CHECK (time_format IN ('12','24'));