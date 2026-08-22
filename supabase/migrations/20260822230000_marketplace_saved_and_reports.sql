-- Phase 1: persist marketplace "saved" favorites and listing reports that were
-- previously browser-localStorage only. Listings themselves already live in
-- public.marketplace_listings (canon_platform migration).

-- Per-user saved/favorited listings.
CREATE TABLE public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_listings TO authenticated;
GRANT ALL ON public.saved_listings TO service_role;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved listings" ON public.saved_listings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Listing reports feed the moderation queue (Canon 3 / Canon 10).
CREATE TABLE public.listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own reports" ON public.listing_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own reports" ON public.listing_reports FOR SELECT USING (user_id = auth.uid());
