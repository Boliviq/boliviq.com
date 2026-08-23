-- INSERT ... RETURNING on conversations evaluates SELECT policies before a
-- SECURITY DEFINER helper can see the new row. Keep a direct created_by check.
DROP POLICY IF EXISTS "participants read conversations" ON public.conversations;
CREATE POLICY "participants read conversations" ON public.conversations
  FOR SELECT USING (
    created_by = auth.uid() OR public.is_conversation_participant(id, auth.uid())
  );
