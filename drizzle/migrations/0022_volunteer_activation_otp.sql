CREATE TABLE public.volunteer_activation_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  volunteer_id uuid,
  org_slug text NOT NULL,
  rut_norm text NOT NULL,
  email_norm text NOT NULL,
  code_hash text,
  ip_hash text NOT NULL,
  matched boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  consent_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.volunteer_activation_challenges TO service_role;
ALTER TABLE public.volunteer_activation_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX vac_ip_idx ON public.volunteer_activation_challenges (ip_hash, created_at);
CREATE INDEX vac_rut_idx ON public.volunteer_activation_challenges (rut_norm, created_at);
COMMENT ON TABLE public.volunteer_activation_challenges IS 'OTP challenges for public volunteer self-activation; service role only. Volunteer consent timestamp recorded per Ley 21.719.';

REVOKE EXECUTE ON FUNCTION public.claim_volunteer_activation(text,text,text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_volunteer_activation(text,text,text) TO service_role;