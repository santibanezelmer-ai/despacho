ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;

UPDATE public.organization_invitations SET last_sent_at = created_at WHERE last_sent_at IS NULL;