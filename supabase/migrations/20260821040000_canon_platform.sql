-- Canon platform foundation: roles, marketplace, messaging, projects, documents,
-- verification, workspaces, and AI credit ledger. Existing investor CRM tables remain.

CREATE TYPE public.profile_role AS ENUM (
  'homeowner','contractor','trade','realtor','investor','wholesaler','lender',
  'property_manager','inspector','appraiser','title','insurance','attorney',
  'designer','supplier','other','administrator'
);

CREATE TYPE public.account_kind AS ENUM ('individual','company');
CREATE TYPE public.verification_tier AS ENUM ('unverified','identity','license','insurance','boliviq_certified');
CREATE TYPE public.listing_visibility AS ENUM ('public','limited');
CREATE TYPE public.credit_entry_status AS ENUM ('posted','reserved','released','refunded','adjustment');

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'appointment_scheduled';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'proposal_created';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'in_progress';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_role public.profile_role NOT NULL DEFAULT 'homeowner',
  ADD COLUMN IF NOT EXISTS secondary_roles public.profile_role[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS service_area TEXT,
  ADD COLUMN IF NOT EXISTS account_kind public.account_kind NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS comms_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace owner write" ON public.workspaces FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memberships" ON public.workspace_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "owners manage members" ON public.workspace_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
);

CREATE POLICY "workspace members read" ON public.workspaces FOR SELECT USING (
  owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = id AND m.user_id = auth.uid()
  )
);

CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT,
  price NUMERIC,
  price_label TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  visibility public.listing_visibility NOT NULL DEFAULT 'public',
  expires_at TIMESTAMPTZ,
  reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public listings readable" ON public.marketplace_listings FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid()
);
CREATE POLICY "own listings write" ON public.marketplace_listings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  context TEXT,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read conversations" ON public.conversations FOR SELECT USING (
  created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "creator insert conversations" ON public.conversations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "own participant rows" ON public.conversation_participants FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = messages.conversation_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY "sender insert messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE TABLE public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role public.profile_role NOT NULL,
  company_name TEXT,
  bio TEXT,
  service_area TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  license_number TEXT,
  insurance_policy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are readable" ON public.professional_profiles FOR SELECT USING (true);
CREATE POLICY "own professional profile" ON public.professional_profiles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.verification_tier NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verification_records TO authenticated;
GRANT ALL ON public.verification_records TO service_role;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own verification" ON public.verification_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "request verification" ON public.verification_records FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  budget NUMERIC,
  spent NUMERIC,
  next_milestone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- public.documents already exists from the initial CRM migration (20260712021149).
-- Extend it with the canon columns instead of recreating it (which fails on a fresh DB).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS related TEXT,
  ADD COLUMN IF NOT EXISTS restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own documents" ON public.documents;
CREATE POLICY "own documents" ON public.documents FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet" ON public.credit_wallets FOR SELECT USING (user_id = auth.uid());

CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  delta NUMERIC NOT NULL,
  status public.credit_entry_status NOT NULL DEFAULT 'posted',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet owner reads ledger" ON public.credit_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid())
);

CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  record_type TEXT,
  record_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit_logs FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
);
