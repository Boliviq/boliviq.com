-- Boliviq Real Estate Investor Operating System
-- Extends canonical_properties + CRM properties. No duplicate property/billing/CRM systems.

-- ---------------------------------------------------------------------------
-- Provenance / data classification
-- ---------------------------------------------------------------------------
CREATE TYPE public.data_provenance_class AS ENUM (
  'verified', 'provider_data', 'estimate', 'ai_inference', 'user_provided', 'demo'
);

CREATE TYPE public.deal_risk_level AS ENUM ('green', 'yellow', 'red');

CREATE TYPE public.transaction_phase AS ENUM (
  'offer', 'accepted', 'earnest_money', 'inspection', 'due_diligence',
  'title', 'financing', 'insurance', 'appraisal', 'closing_documents',
  'closing', 'completed', 'cancelled'
);

CREATE TYPE public.portfolio_asset_status AS ENUM (
  'under_contract', 'owned', 'rehab', 'rented', 'listed', 'sold', 'disposed'
);

CREATE TYPE public.outreach_channel AS ENUM (
  'phone', 'ai_call', 'sms', 'email', 'direct_mail', 'postcard', 'campaign'
);

CREATE TYPE public.alert_digest AS ENUM ('instant', 'daily', 'weekly', 'none');

-- ---------------------------------------------------------------------------
-- Unified property activity timeline (workspace/user scoped visibility)
-- ---------------------------------------------------------------------------
CREATE TABLE public.property_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  provenance public.data_provenance_class NOT NULL DEFAULT 'user_provided',
  source_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (canonical_property_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX idx_timeline_canon ON public.property_timeline_events(canonical_property_id, event_at DESC);
CREATE INDEX idx_timeline_property ON public.property_timeline_events(property_id, event_at DESC);
CREATE INDEX idx_timeline_user ON public.property_timeline_events(user_id, event_at DESC);

-- ---------------------------------------------------------------------------
-- Field-level provenance (optional attach to canonical property fields)
-- ---------------------------------------------------------------------------
CREATE TABLE public.property_field_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  classification public.data_provenance_class NOT NULL DEFAULT 'estimate',
  source_label TEXT,
  source_url TEXT,
  confidence_score INT CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  last_verified_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canonical_property_id, field_name, source_label)
);

CREATE INDEX idx_field_prov_canon ON public.property_field_provenance(canonical_property_id);

-- ---------------------------------------------------------------------------
-- Shared scoring: deal risk, buyer match, funding match (distress/opportunity already exist)
-- ---------------------------------------------------------------------------
CREATE TABLE public.deal_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  overall_level public.deal_risk_level NOT NULL DEFAULT 'green',
  risk_score INT NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  signals JSONB NOT NULL DEFAULT '[]',
  score_version TEXT NOT NULL DEFAULT 'v1',
  disclaimer TEXT NOT NULL DEFAULT 'Boliviq risk analysis is informational and does not replace professional title, legal, inspection, survey or due diligence.',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_risk_canon ON public.deal_risk_assessments(canonical_property_id, calculated_at DESC);

-- ---------------------------------------------------------------------------
-- Exit scenarios
-- ---------------------------------------------------------------------------
CREATE TABLE public.exit_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}',
  recommended BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (canonical_property_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX idx_exit_scenarios_user ON public.exit_scenarios(user_id, created_at DESC);
CREATE INDEX idx_exit_scenarios_canon ON public.exit_scenarios(canonical_property_id);

-- ---------------------------------------------------------------------------
-- Construction estimates + contractor bid requests
-- ---------------------------------------------------------------------------
CREATE TABLE public.construction_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Rehab estimate',
  scope_of_work JSONB NOT NULL DEFAULT '[]',
  materials_total NUMERIC,
  labor_total NUMERIC,
  contingency_pct NUMERIC DEFAULT 10,
  contingency_amount NUMERIC,
  grand_total NUMERIC,
  timeline_weeks_min INT,
  timeline_weeks_max INT,
  assumptions JSONB NOT NULL DEFAULT '{}',
  provenance public.data_provenance_class NOT NULL DEFAULT 'ai_inference',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contractor_bid_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_estimate_id UUID REFERENCES public.construction_estimates(id) ON DELETE SET NULL,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  scope_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contractor_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_request_id UUID NOT NULL REFERENCES public.contractor_bid_requests(id) ON DELETE CASCADE,
  contractor_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  contractor_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  timeline_weeks INT,
  scope_exclusions TEXT,
  license_info TEXT,
  insurance_info TEXT,
  comments TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_construction_est_user ON public.construction_estimates(user_id);
CREATE INDEX idx_bid_requests_user ON public.contractor_bid_requests(user_id);

-- ---------------------------------------------------------------------------
-- Zoning / permits
-- ---------------------------------------------------------------------------
CREATE TABLE public.zoning_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  zoning_code TEXT,
  zoning_label TEXT,
  permitted_uses TEXT[] NOT NULL DEFAULT '{}',
  lot_dimensions TEXT,
  setbacks JSONB NOT NULL DEFAULT '{}',
  density TEXT,
  height_limit TEXT,
  lot_coverage TEXT,
  min_lot_size TEXT,
  adu_potential TEXT,
  multifamily_potential TEXT,
  subdivision_potential TEXT,
  commercial_potential TEXT,
  hidden_opportunity_note TEXT,
  certainty public.data_provenance_class NOT NULL DEFAULT 'estimate',
  source_label TEXT,
  source_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.property_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  permit_number TEXT,
  permit_type TEXT,
  status TEXT,
  filed_at DATE,
  closed_at DATE,
  description TEXT,
  provenance public.data_provenance_class NOT NULL DEFAULT 'provider_data',
  source_label TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zoning_canon ON public.zoning_snapshots(canonical_property_id);
CREATE INDEX idx_permits_canon ON public.property_permits(canonical_property_id);

-- ---------------------------------------------------------------------------
-- Buy box / Opportunity Radar
-- ---------------------------------------------------------------------------
CREATE TABLE public.investor_buy_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  alert_digest public.alert_digest NOT NULL DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.radar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_box_id UUID NOT NULL REFERENCES public.investor_buy_boxes(id) ON DELETE CASCADE,
  canonical_property_id UUID NOT NULL REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  opportunity_score NUMERIC,
  match_score INT NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buy_box_id, canonical_property_id)
);

CREATE INDEX idx_buy_boxes_user ON public.investor_buy_boxes(user_id);
CREATE INDEX idx_radar_matches_box ON public.radar_matches(buy_box_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Capital / funding marketplace requests + lender criteria
-- ---------------------------------------------------------------------------
CREATE TABLE public.lender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  lender_types TEXT[] NOT NULL DEFAULT '{}',
  states_served TEXT[] NOT NULL DEFAULT '{}',
  min_loan NUMERIC,
  max_loan NUMERIC,
  max_ltv NUMERIC,
  max_ltc NUMERIC,
  max_arv_pct NUMERIC,
  min_credit INT,
  min_experience_deals INT,
  rate_note TEXT,
  points_note TEXT,
  close_days_note TEXT,
  documentation_notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.capital_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  purchase_price NUMERIC,
  rehab NUMERIC,
  arv NUMERIC,
  loan_request NUMERIC,
  exit_strategy TEXT,
  projected_profit NUMERIC,
  experience_level TEXT,
  timeline_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  package JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.funding_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_request_id UUID NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  lender_profile_id UUID NOT NULL REFERENCES public.lender_profiles(id) ON DELETE CASCADE,
  match_score INT NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (capital_request_id, lender_profile_id)
);

-- ---------------------------------------------------------------------------
-- Buyer matching
-- ---------------------------------------------------------------------------
CREATE TABLE public.buyer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  markets TEXT[] NOT NULL DEFAULT '{}',
  asset_types TEXT[] NOT NULL DEFAULT '{}',
  price_min NUMERIC,
  price_max NUMERIC,
  arv_min NUMERIC,
  rehab_max NUMERIC,
  strategies TEXT[] NOT NULL DEFAULT '{}',
  preferred_roi_pct NUMERIC,
  financing_profile TEXT,
  purchase_count INT NOT NULL DEFAULT 0,
  last_purchase_at DATE,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.buyer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  buyer_profile_id UUID NOT NULL REFERENCES public.buyer_profiles(id) ON DELETE CASCADE,
  match_score INT NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_matches_user ON public.buyer_matches(user_id);

-- ---------------------------------------------------------------------------
-- Outreach center + suppression
-- ---------------------------------------------------------------------------
CREATE TABLE public.outreach_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.outreach_channel NOT NULL,
  destination TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, destination)
);

CREATE TABLE public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel public.outreach_channel NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft',
  script_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel public.outreach_channel NOT NULL,
  destination TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_touches_user ON public.outreach_touches(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
CREATE TABLE public.deal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phase public.transaction_phase NOT NULL DEFAULT 'offer',
  contract_date DATE,
  closing_date DATE,
  purchase_price NUMERIC,
  earnest_money NUMERIC,
  inspection_deadline DATE,
  diligence_deadline DATE,
  financing_deadline DATE,
  title_company TEXT,
  lender_name TEXT,
  realtor_name TEXT,
  attorney_name TEXT,
  inspector_name TEXT,
  insurance_provider TEXT,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transaction_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.deal_transactions(id) ON DELETE CASCADE,
  phase public.transaction_phase NOT NULL,
  title TEXT NOT NULL,
  due_at DATE,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON public.deal_transactions(user_id, updated_at DESC);
CREATE INDEX idx_tx_milestones_tx ON public.transaction_milestones(transaction_id, sort_order);

-- ---------------------------------------------------------------------------
-- Portfolio owned assets (same property continues — no duplicate)
-- ---------------------------------------------------------------------------
CREATE TABLE public.portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  canonical_property_id UUID REFERENCES public.canonical_properties(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.deal_transactions(id) ON DELETE SET NULL,
  status public.portfolio_asset_status NOT NULL DEFAULT 'owned',
  purchase_price NUMERIC,
  purchase_date DATE,
  rehab_cost NUMERIC,
  capital_improvements NUMERIC DEFAULT 0,
  loan_balance NUMERIC,
  loan_rate NUMERIC,
  loan_maturity DATE,
  monthly_payment NUMERIC,
  current_value_est NUMERIC,
  rent_monthly NUMERIC,
  vacancy_pct NUMERIC DEFAULT 5,
  taxes_annual NUMERIC,
  insurance_annual NUMERIC,
  hoa_monthly NUMERIC,
  maintenance_monthly NUMERIC,
  other_expenses_monthly NUMERIC,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_portfolio_user ON public.portfolio_assets(user_id, status);

-- ---------------------------------------------------------------------------
-- AI acquisition agent runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  agent_key TEXT NOT NULL DEFAULT 'acquisition',
  prompt TEXT NOT NULL,
  parsed_filters JSONB NOT NULL DEFAULT '{}',
  result_summary JSONB NOT NULL DEFAULT '{}',
  credits_charged INT NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_runs_user ON public.ai_agent_runs(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Investor OS entitlements (extends plan flags; does not replace subscriptions)
-- ---------------------------------------------------------------------------
CREATE TABLE public.investor_os_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier TEXT NOT NULL UNIQUE,
  distressed_search BOOLEAN NOT NULL DEFAULT true,
  opportunity_radar BOOLEAN NOT NULL DEFAULT false,
  ai_acquisition_agent BOOLEAN NOT NULL DEFAULT false,
  funding_marketplace BOOLEAN NOT NULL DEFAULT false,
  construction_ai BOOLEAN NOT NULL DEFAULT false,
  owner_outreach BOOLEAN NOT NULL DEFAULT false,
  portfolio BOOLEAN NOT NULL DEFAULT true,
  buyer_matching BOOLEAN NOT NULL DEFAULT false,
  zoning_intelligence BOOLEAN NOT NULL DEFAULT false,
  advanced_risk_analysis BOOLEAN NOT NULL DEFAULT false,
  transaction_center BOOLEAN NOT NULL DEFAULT false,
  exit_engine BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.investor_os_entitlements (
  plan_tier, distressed_search, opportunity_radar, ai_acquisition_agent, funding_marketplace,
  construction_ai, owner_outreach, portfolio, buyer_matching, zoning_intelligence,
  advanced_risk_analysis, transaction_center, exit_engine
) VALUES
  ('free', true, false, false, false, false, false, true, false, false, false, false, true),
  ('beginner', true, true, false, true, false, true, true, false, true, false, true, true),
  ('professional', true, true, true, true, true, true, true, true, true, true, true, true),
  ('professional_ai_max', true, true, true, true, true, true, true, true, true, true, true, true),
  ('team', true, true, true, true, true, true, true, true, true, true, true, true),
  ('team_ai_max', true, true, true, true, true, true, true, true, true, true, true, true);

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_timeline_events TO authenticated;
GRANT SELECT ON public.property_field_provenance TO authenticated;
GRANT SELECT, INSERT ON public.deal_risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exit_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_bid_requests TO authenticated;
GRANT SELECT, INSERT ON public.contractor_bids TO authenticated;
GRANT SELECT ON public.zoning_snapshots, public.property_permits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_buy_boxes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.radar_matches TO authenticated;
GRANT SELECT ON public.lender_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_requests TO authenticated;
GRANT SELECT ON public.funding_matches TO authenticated;
GRANT SELECT ON public.buyer_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.buyer_matches TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.outreach_suppressions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outreach_touches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_assets TO authenticated;
GRANT SELECT, INSERT ON public.ai_agent_runs TO authenticated;
GRANT SELECT ON public.investor_os_entitlements TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.property_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_field_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoning_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_buy_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_touches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_os_entitlements ENABLE ROW LEVEL SECURITY;

-- Catalog/reference readable
CREATE POLICY "timeline read own or public demo" ON public.property_timeline_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR is_demo = true);
CREATE POLICY "timeline write own" ON public.property_timeline_events FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "field provenance read" ON public.property_field_provenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "zoning read" ON public.zoning_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "permits read" ON public.property_permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "lenders read" ON public.lender_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "buyers read demo or own" ON public.buyer_profiles FOR SELECT TO authenticated
  USING (is_demo = true OR user_id = auth.uid());
CREATE POLICY "entitlements read" ON public.investor_os_entitlements FOR SELECT TO authenticated USING (true);

CREATE POLICY "risk read" ON public.deal_risk_assessments FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR is_demo = true);
CREATE POLICY "risk insert own" ON public.deal_risk_assessments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "exit own" ON public.exit_scenarios FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "construction own" ON public.construction_estimates FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bid requests own" ON public.contractor_bid_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bids read" ON public.contractor_bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "bids insert" ON public.contractor_bids FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "buy boxes own" ON public.investor_buy_boxes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "radar via buy box" ON public.radar_matches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investor_buy_boxes b WHERE b.id = buy_box_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.investor_buy_boxes b WHERE b.id = buy_box_id AND b.user_id = auth.uid()));

CREATE POLICY "capital own" ON public.capital_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "funding matches via request" ON public.funding_matches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.capital_requests r WHERE r.id = capital_request_id AND r.user_id = auth.uid()));

CREATE POLICY "buyer matches own" ON public.buyer_matches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "suppressions own" ON public.outreach_suppressions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns own" ON public.outreach_campaigns FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "touches own" ON public.outreach_touches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions own" ON public.deal_transactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "milestones via tx" ON public.transaction_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deal_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deal_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));

CREATE POLICY "portfolio own" ON public.portfolio_assets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai runs own" ON public.ai_agent_runs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin write on entitlements / lender profiles
CREATE POLICY "admin entitlements write" ON public.investor_os_entitlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin lenders write" ON public.lender_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_exit_scenarios_updated BEFORE UPDATE ON public.exit_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_construction_est_updated BEFORE UPDATE ON public.construction_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_buy_boxes_updated BEFORE UPDATE ON public.investor_buy_boxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_capital_req_updated BEFORE UPDATE ON public.capital_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.deal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portfolio_updated BEFORE UPDATE ON public.portfolio_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lenders_updated BEFORE UPDATE ON public.lender_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_outreach_campaigns_updated BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
