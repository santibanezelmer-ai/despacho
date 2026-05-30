ALTER TABLE public.emergency_keys DROP CONSTRAINT IF EXISTS emergency_keys_code_key;
ALTER TABLE public.emergency_keys ADD CONSTRAINT emergency_keys_org_code_key UNIQUE (organization_id, code);