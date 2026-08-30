ALTER TABLE public.ranks ADD COLUMN IF NOT EXISTS is_authority boolean NOT NULL DEFAULT false;

UPDATE public.ranks
SET is_authority = true
WHERE is_authority = false
  AND (
    lower(name) LIKE '%comandante%' OR
    lower(name) LIKE '%capit%' OR
    lower(name) LIKE '%teniente%' OR
    lower(name) LIKE '%superintendente%' OR
    lower(name) LIKE '%inspector%' OR
    lower(name) LIKE '%director%' OR
    lower(name) LIKE '%ayudante%'
  );