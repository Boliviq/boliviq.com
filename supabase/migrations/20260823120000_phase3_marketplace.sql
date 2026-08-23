-- Phase 3: marketplace media, analytics, saved searches, listing → lead.

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT;

CREATE TABLE public.listing_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, viewer_id)
);
GRANT SELECT, INSERT ON public.listing_views TO authenticated;
GRANT ALL ON public.listing_views TO service_role;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own listing views" ON public.listing_views
  FOR SELECT USING (viewer_id = auth.uid());
CREATE POLICY "record own listing view" ON public.listing_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());

CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  category TEXT,
  location TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved searches" ON public.saved_searches
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Public listing photos. Signed/private URLs can replace this in Phase 10 if needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-media',
  'marketplace-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "listing media insert" ON storage.objects;
CREATE POLICY "listing media insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-media');

DROP POLICY IF EXISTS "listing media select" ON storage.objects;
CREATE POLICY "listing media select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'marketplace-media');

DROP POLICY IF EXISTS "listing media delete own" ON storage.objects;
CREATE POLICY "listing media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketplace-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
