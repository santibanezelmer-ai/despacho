
-- Create device_tokens table
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tokens
CREATE POLICY "dt_insert" ON public.device_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "dt_update" ON public.device_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can select their own tokens, superadmins can see all
CREATE POLICY "dt_select" ON public.device_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_superadmin());

-- Users can delete their own tokens
CREATE POLICY "dt_delete" ON public.device_tokens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role (edge functions) needs to read all tokens for an org
-- This is handled by using service_role key in edge function
