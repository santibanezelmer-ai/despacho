CREATE TABLE public.password_reset_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  location text,
  network text,
  device text,
  ip_masked text,
  requested_at_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_context_email_idx ON public.password_reset_context (email, created_at DESC);
GRANT ALL ON public.password_reset_context TO service_role;
ALTER TABLE public.password_reset_context ENABLE ROW LEVEL SECURITY;