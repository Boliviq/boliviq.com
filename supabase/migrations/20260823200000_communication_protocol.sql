-- Canon 4 communication protocol (additive). last_read_at already exists on
-- conversation_participants. Thread types, notification prefs, blocks, and
-- reports are new. No destructive drops.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS thread_type TEXT NOT NULL DEFAULT 'direct';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_thread_type_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_thread_type_check
  CHECK (thread_type IN ('direct', 'group', 'property', 'project'));

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_thread_type_idx ON public.conversations (thread_type);
CREATE INDEX IF NOT EXISTS conversations_project_id_idx ON public.conversations (project_id);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  opted_out_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notification preferences" ON public.notification_preferences;
CREATE POLICY "own notification preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.conversation_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_blocks TO authenticated;
GRANT ALL ON public.conversation_blocks TO service_role;
ALTER TABLE public.conversation_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own conversation blocks" ON public.conversation_blocks;
CREATE POLICY "own conversation blocks" ON public.conversation_blocks
  FOR ALL USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.conversation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conversation_reports TO authenticated;
GRANT ALL ON public.conversation_reports TO service_role;
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own conversation reports" ON public.conversation_reports;
CREATE POLICY "own conversation reports" ON public.conversation_reports
  FOR ALL USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());
