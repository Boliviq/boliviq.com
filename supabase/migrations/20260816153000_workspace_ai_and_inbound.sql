-- AI usage metering (Boliviq Credits)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON public.ai_usage (user_id, created_at DESC);
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Public contact / demo submissions
CREATE TABLE IF NOT EXISTS public.inbound_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'contact',
  name text,
  email text,
  subject text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inbound_submissions TO service_role;
ALTER TABLE public.inbound_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view inbound submissions"
  ON public.inbound_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Persist deal-analyzer / calculator output on the property
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS analysis jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS integrations_user_provider_idx
  ON public.integrations (user_id, provider);
