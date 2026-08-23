-- Canon 4 leftovers: file attachments and outbound notification intents.
-- Providers stay off; intents record whether a send would be allowed.

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT ALL ON public.message_attachments TO service_role;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants read attachments" ON public.message_attachments;
CREATE POLICY "participants read attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "sender writes attachments" ON public.message_attachments;
CREATE POLICY "sender writes attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.notification_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'skipped', 'sent', 'failed')),
  skip_reason TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notification_intents TO authenticated;
GRANT ALL ON public.notification_intents TO service_role;
ALTER TABLE public.notification_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notification intents" ON public.notification_intents;
CREATE POLICY "own notification intents" ON public.notification_intents
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "participants write notification intents" ON public.notification_intents;
CREATE POLICY "participants write notification intents" ON public.notification_intents
  FOR INSERT WITH CHECK (
    conversation_id IS NOT NULL
    AND public.is_conversation_participant(conversation_id, auth.uid())
    AND public.is_conversation_participant(conversation_id, user_id)
  );

CREATE INDEX IF NOT EXISTS notification_intents_user_created_idx
  ON public.notification_intents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx
  ON public.message_attachments (message_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "message attachments insert" ON storage.objects;
CREATE POLICY "message attachments insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "message attachments select" ON storage.objects;
CREATE POLICY "message attachments select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND public.is_conversation_participant(split_part(name, '/', 2)::uuid, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "message attachments delete own" ON storage.objects;
CREATE POLICY "message attachments delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
