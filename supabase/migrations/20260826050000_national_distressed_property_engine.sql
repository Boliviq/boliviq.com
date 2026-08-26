-- Boliviq National Distressed Property Engine
-- Extends existing property/CRM/credit/admin architecture.
-- Does NOT replace user-owned CRM properties; adds shared canonical catalog.

-- ---------------------------------------------------------------------------
-- Enums / taxonomy
-- ---------------------------------------------------------------------------
CREATE TYPE public.geo_equivalent_type AS ENUM (
  'county', 'parish', 'borough', 'census_area', 'independent_city',
  'municipality', 'federal_district', 'county_equivalent'
);

CREATE TYPE public.source_verification_status AS ENUM (
  'unknown', 'discovered', 'pending_validation', 'verified', 'active',
  'degraded', 'unavailable', 'blocked', 'manual_only', 'invalid', 'replaced'
);

CREATE TYPE public.distress_category AS ENUM (
  'foreclosure', 'tax', 'code', 'vacancy', 'government'
);

CREATE TYPE public.distress_subtype AS ENUM (
  -- foreclosure
  'notice_of_default', 'lis_pendens', 'foreclosure_filed', 'trustee_sale',
  'sheriff_sale', 'auction_scheduled', 'auction_postponed', 'auction_cancelled',
  'foreclosure_completed', 'reo',
  -- tax
  'tax_delinquent', 'tax_lien', 'tax_lien_sale', 'tax_deed_sale',
  'tax_foreclosure', 'redemption_period',
  -- code
  'code_violation', 'unsafe_structure', 'dangerous_building', 'condemned',
  'uninhabitable', 'nuisance', 'demolition_order', 'boarded_property',
  'abandoned_property',
  -- vacancy
  'vacant', 'zombie_foreclosure', 'absentee_owner', 'utility_disconnect',
  -- government
  'land_bank', 'municipal_inventory', 'county_inventory', 'surplus_property',
  'hud_reo', 'usda_reo', 'va_reo', 'fannie_mae_reo', 'freddie_mac_reo'
);

CREATE TYPE public.distress_event_status AS ENUM (
  'active', 'scheduled', 'postponed', 'cancelled', 'resolved', 'expired', 'unknown'
);

CREATE TYPE public.ingestion_access_method AS ENUM (
  'api', 'file_download', 'csv', 'json', 'xml', 'scrape', 'webhook', 'manual', 'unknown'
);

CREATE TYPE public.provider_connection_status AS ENUM (
  'not_connected', 'configured', 'healthy', 'degraded', 'error', 'disabled'
);

-- Extra CRM stages useful for distressed acquisition (extend existing enum)
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'watching';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'auction_target';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'due_diligence';

-- ---------------------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------------------
CREATE TABLE public.geo_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.geo_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.geo_countries(code) ON DELETE CASCADE,
  fips TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, fips),
  UNIQUE (country_code, code)
);

CREATE TABLE public.geo_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.geo_states(id) ON DELETE CASCADE,
  state_fips TEXT NOT NULL,
  county_fips TEXT NOT NULL,
  fips TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  equivalent_type public.geo_equivalent_type NOT NULL DEFAULT 'county',
  primary_government_website TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  active_record_count INT NOT NULL DEFAULT 0,
  data_freshness_hours INT,
  last_successful_sync TIMESTAMPTZ,
  last_attempted_sync TIMESTAMPTZ,
  sync_status public.source_verification_status NOT NULL DEFAULT 'unknown',
  error_state TEXT,
  verification_state public.source_verification_status NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.geo_municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.geo_counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  municipality_type TEXT,
  fips TEXT,
  website TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

CREATE TABLE public.geo_zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip TEXT NOT NULL,
  county_id UUID REFERENCES public.geo_counties(id) ON DELETE SET NULL,
  state_code TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zip, county_id)
);

CREATE INDEX idx_geo_counties_state ON public.geo_counties(state_id);
CREATE INDEX idx_geo_counties_state_fips ON public.geo_counties(state_fips);
CREATE INDEX idx_geo_municipalities_county ON public.geo_municipalities(county_id);
CREATE INDEX idx_geo_zip_county ON public.geo_zip_codes(county_id);
CREATE INDEX idx_geo_zip_code ON public.geo_zip_codes(zip);

-- ---------------------------------------------------------------------------
-- Provider + county source registry
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider_kind TEXT NOT NULL, -- commercial | federal | local_government | auction | demo
  description TEXT,
  env_credential_keys TEXT[] NOT NULL DEFAULT '{}',
  connection_status public.provider_connection_status NOT NULL DEFAULT 'not_connected',
  supports_api BOOLEAN NOT NULL DEFAULT false,
  supports_file BOOLEAN NOT NULL DEFAULT false,
  supports_webhook BOOLEAN NOT NULL DEFAULT false,
  supports_incremental BOOLEAN NOT NULL DEFAULT false,
  rate_limit_per_minute INT,
  config JSONB NOT NULL DEFAULT '{}',
  last_health_check TIMESTAMPTZ,
  health_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.county_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.geo_counties(id) ON DELETE CASCADE,
  municipality_id UUID REFERENCES public.geo_municipalities(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.distress_providers(id) ON DELETE SET NULL,
  agency_name TEXT NOT NULL,
  source_category TEXT NOT NULL, -- recorder | clerk_court | sheriff | tax | code | building | condemned | land_bank | surplus | auction | open_data | other
  url TEXT,
  api_endpoint TEXT,
  access_method public.ingestion_access_method NOT NULL DEFAULT 'unknown',
  scraper_adapter TEXT,
  file_import_method TEXT,
  credentials_required BOOLEAN NOT NULL DEFAULT false,
  verification_status public.source_verification_status NOT NULL DEFAULT 'unknown',
  verification_owner TEXT,
  last_verified_at TIMESTAMPTZ,
  sync_frequency_minutes INT,
  sync_status public.source_verification_status NOT NULL DEFAULT 'unknown',
  last_sync_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  record_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_county_sources_county ON public.county_data_sources(county_id);
CREATE INDEX idx_county_sources_category ON public.county_data_sources(source_category);
CREATE INDEX idx_county_sources_verification ON public.county_data_sources(verification_status);
CREATE INDEX idx_county_sources_sync ON public.county_data_sources(sync_status);

-- ---------------------------------------------------------------------------
-- Canonical shared property catalog (searchable by all authenticated users)
-- Links into existing CRM properties via properties.canonical_property_id
-- ---------------------------------------------------------------------------
CREATE TABLE public.canonical_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES public.geo_counties(id) ON DELETE SET NULL,
  county_fips TEXT,
  state_code TEXT,
  city TEXT,
  zip TEXT,
  municipality_id UUID REFERENCES public.geo_municipalities(id) ON DELETE SET NULL,
  apn TEXT,
  address_raw TEXT,
  address_normalized TEXT NOT NULL,
  street_number TEXT,
  street_name TEXT,
  unit TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  property_type TEXT,
  beds NUMERIC,
  baths NUMERIC,
  sqft NUMERIC,
  lot_size NUMERIC,
  year_built INT,
  estimated_value NUMERIC,
  estimated_arv NUMERIC,
  estimated_rehab NUMERIC,
  estimated_equity NUMERIC,
  equity_pct NUMERIC,
  opening_bid NUMERIC,
  loan_balance NUMERIC,
  delinquent_taxes NUMERIC,
  estimated_liens NUMERIC,
  potential_spread NUMERIC,
  monthly_rent_est NUMERIC,
  owner_name TEXT,
  owner_type TEXT, -- individual | company | government | land_bank | unknown
  owner_occupied BOOLEAN,
  absentee_owner BOOLEAN,
  occupancy_status TEXT,
  ownership_duration_months INT,
  match_key TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  active_distress BOOLEAN NOT NULL DEFAULT false,
  distress_score NUMERIC,
  opportunity_score NUMERIC,
  score_version TEXT,
  score_calculated_at TIMESTAMPTZ,
  score_components JSONB NOT NULL DEFAULT '{}',
  score_signals JSONB NOT NULL DEFAULT '[]',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_key)
);

CREATE INDEX idx_canon_prop_county_fips ON public.canonical_properties(county_fips);
CREATE INDEX idx_canon_prop_state ON public.canonical_properties(state_code);
CREATE INDEX idx_canon_prop_city ON public.canonical_properties(state_code, city);
CREATE INDEX idx_canon_prop_zip ON public.canonical_properties(zip);
CREATE INDEX idx_canon_prop_apn ON public.canonical_properties(county_fips, apn) WHERE apn IS NOT NULL;
CREATE INDEX idx_canon_prop_addr ON public.canonical_properties(address_normalized);
CREATE INDEX idx_canon_prop_active ON public.canonical_properties(active_distress) WHERE active_distress = true;
CREATE INDEX idx_canon_prop_distress_score ON public.canonical_properties(distress_score DESC NULLS LAST);
CREATE INDEX idx_canon_prop_opportunity_score ON public.canonical_properties(opportunity_score DESC NULLS LAST);
CREATE INDEX idx_canon_prop_geo ON public.canonical_properties(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_canon_prop_demo ON public.canonical_properties(is_demo);

-- Link existing CRM properties to canonical catalog (nullable; preserves all existing rows)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_properties_canonical ON public.properties(canonical_property_id);

-- ---------------------------------------------------------------------------
-- Source records (raw retention) + distress events
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.distress_providers(id) ON DELETE SET NULL,
  county_source_id UUID REFERENCES public.county_data_sources(id) ON DELETE SET NULL,
  source_record_id TEXT NOT NULL,
  source_key TEXT NOT NULL UNIQUE, -- deterministic idempotency key
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  confidence_score INT NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_status public.source_verification_status NOT NULL DEFAULT 'unknown',
  raw_payload JSONB NOT NULL DEFAULT '{}',
  normalized_payload JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_records_property ON public.distress_source_records(canonical_property_id);
CREATE INDEX idx_source_records_provider ON public.distress_source_records(provider_id);

CREATE TABLE public.distress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.county_data_sources(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.distress_providers(id) ON DELETE SET NULL,
  source_record_id TEXT,
  source_key TEXT NOT NULL UNIQUE,
  category public.distress_category NOT NULL,
  subtype public.distress_subtype NOT NULL,
  status public.distress_event_status NOT NULL DEFAULT 'active',
  filing_date DATE,
  recording_date DATE,
  notice_date DATE,
  auction_date DATE,
  sale_date DATE,
  cure_date DATE,
  resolution_date DATE,
  original_balance NUMERIC,
  current_balance NUMERIC,
  delinquent_amount NUMERIC,
  tax_amount_due NUMERIC,
  opening_bid NUMERIC,
  judgment_amount NUMERIC,
  estimated_lien_amount NUMERIC,
  lender TEXT,
  servicer TEXT,
  plaintiff TEXT,
  defendant TEXT,
  trustee TEXT,
  sheriff TEXT,
  taxing_authority TEXT,
  code_case_number TEXT,
  violation_description TEXT,
  condemnation_reason TEXT,
  demolition_status TEXT,
  occupancy_status TEXT,
  vacancy_indicator BOOLEAN,
  owner_occupied_indicator BOOLEAN,
  document_url TEXT,
  source_url TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  confidence_score INT NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source_verification_status public.source_verification_status NOT NULL DEFAULT 'unknown',
  field_attribution JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_distress_events_property ON public.distress_events(property_id);
CREATE INDEX idx_distress_events_category ON public.distress_events(category);
CREATE INDEX idx_distress_events_subtype ON public.distress_events(subtype);
CREATE INDEX idx_distress_events_status ON public.distress_events(status);
CREATE INDEX idx_distress_events_auction ON public.distress_events(auction_date) WHERE auction_date IS NOT NULL;
CREATE INDEX idx_distress_events_filing ON public.distress_events(filing_date);
CREATE INDEX idx_distress_events_active_cat ON public.distress_events(property_id, category)
  WHERE status IN ('active', 'scheduled', 'postponed');

-- ---------------------------------------------------------------------------
-- Score weight configuration (admin-tunable)
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_score_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  weights JSONB NOT NULL,
  opportunity_weights JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Entitlements for distressed feature (config, not hard-coded in UI)
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier TEXT NOT NULL UNIQUE,
  max_search_results INT NOT NULL DEFAULT 25,
  can_use_advanced_filters BOOLEAN NOT NULL DEFAULT false,
  can_use_map_layers BOOLEAN NOT NULL DEFAULT false,
  can_save_searches INT NOT NULL DEFAULT 1,
  can_use_ai_analysis BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  can_watchlist INT NOT NULL DEFAULT 5,
  credits_owner_lookup INT NOT NULL DEFAULT 5,
  credits_ai_analysis INT NOT NULL DEFAULT 10,
  credits_enrichment INT NOT NULL DEFAULT 8,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Saved searches + watchlists (distress-specific, user-owned)
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  notify_on_new_property BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_event BOOLEAN NOT NULL DEFAULT true,
  notify_on_auction_change BOOLEAN NOT NULL DEFAULT true,
  notify_on_status_change BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.distress_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, canonical_property_id)
);

CREATE TABLE public.distress_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id UUID REFERENCES public.distress_saved_searches(id) ON DELETE SET NULL,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.distress_events(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_distress_saved_user ON public.distress_saved_searches(user_id);
CREATE INDEX idx_distress_watch_user ON public.distress_watchlist(user_id);
CREATE INDEX idx_distress_notif_user ON public.distress_notifications(user_id, read_at);

-- ---------------------------------------------------------------------------
-- Ingestion runs / health
-- ---------------------------------------------------------------------------
CREATE TABLE public.distress_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.distress_providers(id) ON DELETE SET NULL,
  county_source_id UUID REFERENCES public.county_data_sources(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL DEFAULT 'incremental', -- full | incremental | date_window | file | demo
  status TEXT NOT NULL DEFAULT 'running', -- running | success | partial | failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  records_received INT NOT NULL DEFAULT 0,
  records_created INT NOT NULL DEFAULT 0,
  records_updated INT NOT NULL DEFAULT 0,
  records_rejected INT NOT NULL DEFAULT 0,
  duplicates INT NOT NULL DEFAULT 0,
  api_errors INT NOT NULL DEFAULT 0,
  parsing_errors INT NOT NULL DEFAULT 0,
  schema_changes INT NOT NULL DEFAULT 0,
  auth_failures INT NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_ingestion_runs_provider ON public.distress_ingestion_runs(provider_id, started_at DESC);
CREATE INDEX idx_ingestion_runs_status ON public.distress_ingestion_runs(status);

CREATE TABLE public.distress_coverage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL, -- country | state | county
  scope_key TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_key)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_geo_counties_updated BEFORE UPDATE ON public.geo_counties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_county_sources_updated BEFORE UPDATE ON public.county_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_distress_providers_updated BEFORE UPDATE ON public.distress_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_canonical_properties_updated BEFORE UPDATE ON public.canonical_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_distress_events_updated BEFORE UPDATE ON public.distress_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_distress_saved_updated BEFORE UPDATE ON public.distress_saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.geo_countries, public.geo_states, public.geo_counties,
  public.geo_municipalities, public.geo_zip_codes TO authenticated;
GRANT ALL ON public.geo_countries, public.geo_states, public.geo_counties,
  public.geo_municipalities, public.geo_zip_codes TO service_role;

GRANT SELECT ON public.distress_providers TO authenticated;
GRANT ALL ON public.distress_providers TO service_role;

GRANT SELECT ON public.county_data_sources TO authenticated;
GRANT ALL ON public.county_data_sources TO service_role;

GRANT SELECT ON public.canonical_properties TO authenticated;
GRANT ALL ON public.canonical_properties TO service_role;

GRANT SELECT ON public.distress_source_records TO authenticated;
GRANT ALL ON public.distress_source_records TO service_role;

GRANT SELECT ON public.distress_events TO authenticated;
GRANT ALL ON public.distress_events TO service_role;

GRANT SELECT ON public.distress_score_weights TO authenticated;
GRANT ALL ON public.distress_score_weights TO service_role;

GRANT SELECT ON public.distress_plan_entitlements TO authenticated;
GRANT ALL ON public.distress_plan_entitlements TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distress_saved_searches TO authenticated;
GRANT ALL ON public.distress_saved_searches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distress_watchlist TO authenticated;
GRANT ALL ON public.distress_watchlist TO service_role;

GRANT SELECT, UPDATE ON public.distress_notifications TO authenticated;
GRANT ALL ON public.distress_notifications TO service_role;

GRANT SELECT ON public.distress_ingestion_runs TO authenticated;
GRANT ALL ON public.distress_ingestion_runs TO service_role;

GRANT SELECT ON public.distress_coverage_metrics TO authenticated;
GRANT ALL ON public.distress_coverage_metrics TO service_role;

ALTER TABLE public.geo_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.county_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_score_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_coverage_metrics ENABLE ROW LEVEL SECURITY;

-- Reference / catalog data: authenticated read
CREATE POLICY "geo countries read" ON public.geo_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "geo states read" ON public.geo_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "geo counties read" ON public.geo_counties FOR SELECT TO authenticated USING (true);
CREATE POLICY "geo municipalities read" ON public.geo_municipalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "geo zips read" ON public.geo_zip_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "distress providers read" ON public.distress_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "county sources read" ON public.county_data_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical properties read" ON public.canonical_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "source records read" ON public.distress_source_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "distress events read" ON public.distress_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "score weights read" ON public.distress_score_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "plan entitlements read" ON public.distress_plan_entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingestion runs read" ON public.distress_ingestion_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "coverage metrics read" ON public.distress_coverage_metrics FOR SELECT TO authenticated USING (true);

-- User-owned rows
CREATE POLICY "own saved searches" ON public.distress_saved_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own watchlist" ON public.distress_watchlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications read" ON public.distress_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.distress_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin write on registry / config via has_role (service_role bypasses RLS for ingestion)
CREATE POLICY "admin write providers" ON public.distress_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write county sources" ON public.county_data_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write score weights" ON public.distress_score_weights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write entitlements" ON public.distress_plan_entitlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write geo counties" ON public.geo_counties FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write ingestion runs" ON public.distress_ingestion_runs FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Seed: country, providers, default weights, entitlements
-- ---------------------------------------------------------------------------
INSERT INTO public.geo_countries (code, name) VALUES ('US', 'United States');

INSERT INTO public.distress_providers (key, name, provider_kind, description, env_credential_keys, supports_api, supports_file, supports_incremental) VALUES
  ('demo', 'Boliviq Demo / Test Feed', 'demo', 'Labeled demo data that exercises the production ingestion pipeline.', '{}', false, true, true),
  ('attom', 'ATTOM Data', 'commercial', 'Commercial national property and distress data provider.', ARRAY['ATTOM_API_KEY'], true, true, true),
  ('hud', 'HUD REO', 'federal', 'HUD real estate owned / foreclosure resale inventory.', ARRAY['HUD_API_KEY'], true, true, true),
  ('usda', 'USDA Rural Development', 'federal', 'USDA foreclosure and resale properties.', ARRAY['USDA_API_KEY'], true, true, true),
  ('va', 'VA Loan Guaranty', 'federal', 'VA foreclosure and resale properties.', ARRAY['VA_API_KEY'], true, true, true),
  ('fannie_mae', 'Fannie Mae HomePath', 'federal', 'Fannie Mae HomePath REO listings.', ARRAY['FANNIE_MAE_API_KEY'], true, true, true),
  ('freddie_mac', 'Freddie Mac HomeSteps', 'federal', 'Freddie Mac HomeSteps REO listings.', ARRAY['FREDDIE_MAC_API_KEY'], true, true, true),
  ('local_government', 'Local Government Adapter', 'local_government', 'Configurable county/city recorder, tax, code, and open-data adapters.', '{}', true, true, true),
  ('auction_platform', 'Auction Platform Adapter', 'auction', 'Configurable external auction-provider mappings (not tied to one vendor).', ARRAY['AUCTION_PROVIDER_API_KEY'], true, true, true);

INSERT INTO public.distress_score_weights (version, is_active, weights, opportunity_weights, notes) VALUES (
  'v1',
  true,
  '{
    "auction_scheduled": 30,
    "foreclosure_filed": 22,
    "notice_of_default": 18,
    "lis_pendens": 16,
    "trustee_sale": 28,
    "sheriff_sale": 28,
    "reo": 24,
    "tax_delinquent": 12,
    "tax_delinquent_multi_year": 20,
    "tax_lien": 14,
    "tax_lien_sale": 18,
    "tax_deed_sale": 22,
    "condemned": 25,
    "demolition_order": 22,
    "unsafe_structure": 18,
    "dangerous_building": 18,
    "code_violation": 10,
    "nuisance": 8,
    "vacant": 8,
    "abandoned_property": 12,
    "zombie_foreclosure": 15,
    "absentee_owner": 8,
    "land_bank": 16,
    "government_owned": 14,
    "multiple_independent_sources": 10,
    "repeated_violations": 8,
    "substantial_estimated_equity": 6
  }'::jsonb,
  '{
    "distress": 0.35,
    "estimated_equity": 0.20,
    "potential_spread": 0.15,
    "opening_bid_discount": 0.10,
    "rental_potential": 0.08,
    "days_in_distress": 0.07,
    "ownership_duration": 0.05
  }'::jsonb,
  'Default Boliviq Distress Score v1 — admin tunable'
);

INSERT INTO public.distress_plan_entitlements (plan_tier, max_search_results, can_use_advanced_filters, can_use_map_layers, can_save_searches, can_use_ai_analysis, can_export, can_watchlist) VALUES
  ('free', 25, false, false, 1, false, false, 5),
  ('beginner', 100, true, true, 5, false, false, 25),
  ('professional', 500, true, true, 25, true, true, 100),
  ('professional_ai_max', 2000, true, true, 100, true, true, 500),
  ('team', 2000, true, true, 100, true, true, 500),
  ('team_ai_max', 5000, true, true, 250, true, true, 2000);
