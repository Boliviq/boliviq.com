-- Break RLS recursion between workspaces ↔ workspace_members (and keep
-- conversation participant policies from querying themselves).

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = _workspace_id AND owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = _conversation_id AND created_by = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = _conversation_id AND user_id = _user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "workspace members read" ON public.workspaces;
CREATE POLICY "workspace members read" ON public.workspaces
  FOR SELECT USING (public.is_workspace_member(id, auth.uid()));

DROP POLICY IF EXISTS "owners manage members" ON public.workspace_members;
CREATE POLICY "owners manage members" ON public.workspace_members
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

DROP POLICY IF EXISTS "participants read conversations" ON public.conversations;
CREATE POLICY "participants read conversations" ON public.conversations
  FOR SELECT USING (
    created_by = auth.uid() OR public.is_conversation_participant(id, auth.uid())
  );

DROP POLICY IF EXISTS "participants read messages" ON public.messages;
CREATE POLICY "participants read messages" ON public.messages
  FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "participants read peers" ON public.conversation_participants;
CREATE POLICY "participants read peers" ON public.conversation_participants
  FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));
