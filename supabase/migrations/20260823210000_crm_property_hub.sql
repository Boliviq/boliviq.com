-- Canon 5 connectivity: property hub links + idempotent conversion audit.
-- Additive only. Does not drop investor CRM tables.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_project_id_idx ON public.leads (project_id);
CREATE INDEX IF NOT EXISTS properties_listing_id_idx ON public.properties (listing_id);

CREATE TABLE IF NOT EXISTS public.object_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversion TEXT NOT NULL,
  from_kind TEXT NOT NULL,
  from_id UUID NOT NULL,
  to_kind TEXT NOT NULL,
  to_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, from_kind, from_id, conversion)
);

GRANT SELECT, INSERT ON public.object_conversions TO authenticated;
GRANT ALL ON public.object_conversions TO service_role;
ALTER TABLE public.object_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own object conversions" ON public.object_conversions;
CREATE POLICY "own object conversions" ON public.object_conversions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
