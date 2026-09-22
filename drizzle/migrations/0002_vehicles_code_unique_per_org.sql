CREATE UNIQUE INDEX IF NOT EXISTS vehicles_org_code_key ON public.vehicles (organization_id, code);
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_code_key;