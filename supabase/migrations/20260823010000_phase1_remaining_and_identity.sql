-- Phase 1 remaining persistence (assistant log, account draft, conversation/credit RLS)
-- plus Phase 2 identity/access columns (workspaces, sessions, suspension).

-- ---------------------------------------------------------------------------
-- Profiles: draft resume, workspace pointer, phone verify, suspension/appeal
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_draft JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS appeal_status TEXT,
  ADD COLUMN IF NOT EXISTS appeal_note TEXT;

-- ---------------------------------------------------------------------------
-- Assistant conversation log (one row per user for Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.assistant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Assistant',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_logs TO authenticated;
GRANT ALL ON public.assistant_logs TO service_role;
ALTER TABLE public.assistant_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assistant log" ON public.assistant_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_assistant_logs_updated
  BEFORE UPDATE ON public.assistant_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Conversation RLS gaps: creator can update + add participants; peers can read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "creator update conversations" ON public.conversations;
CREATE POLICY "creator update conversations" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "creator add participants" ON public.conversation_participants;
CREATE POLICY "creator add participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "participants read peers" ON public.conversation_participants;
CREATE POLICY "participants read peers" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = conversation_participants.conversation_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Credit wallet/ledger writes (Phase 1 persist; Phase 7 deepens metering)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "own wallet insert" ON public.credit_wallets;
CREATE POLICY "own wallet insert" ON public.credit_wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own wallet update" ON public.credit_wallets;
CREATE POLICY "own wallet update" ON public.credit_wallets
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet owner writes ledger" ON public.credit_ledger;
CREATE POLICY "wallet owner writes ledger" ON public.credit_ledger
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.credit_wallets w
      WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Workspace invites + session history (Phase 2)
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage invites" ON public.workspace_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );
CREATE POLICY "invitee reads own invite" ON public.workspace_invites
  FOR SELECT USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
CREATE POLICY "invitee accepts own invite" ON public.workspace_invites
  FOR UPDATE USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) WITH CHECK (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Members may join a workspace when a pending invite matches their email.
DROP POLICY IF EXISTS "accept own invite" ON public.workspace_members;
CREATE POLICY "accept own invite" ON public.workspace_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_invites i
      WHERE i.workspace_id = workspace_members.workspace_id
        AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND i.accepted_at IS NULL
    )
  );

CREATE TABLE public.auth_session_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.auth_session_log TO authenticated;
GRANT ALL ON public.auth_session_log TO service_role;
ALTER TABLE public.auth_session_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session log" ON public.auth_session_log
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- New users get a personal workspace + empty credit wallet
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ws_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.workspaces (owner_id, name)
  VALUES (NEW.id, 'Personal workspace')
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  UPDATE public.profiles SET current_workspace_id = ws_id WHERE id = NEW.id;

  INSERT INTO public.credit_wallets (workspace_id, user_id, balance)
  VALUES (ws_id, NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
