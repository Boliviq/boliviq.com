-- Canon 6: admin review of verification requests. Pending is a request
-- state, not a badge. Owners cannot self-grant.

ALTER TABLE public.verification_records
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "admin read verification" ON public.verification_records;
CREATE POLICY "admin read verification" ON public.verification_records
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin review verification" ON public.verification_records;
CREATE POLICY "admin review verification" ON public.verification_records
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.admin_audit_logs TO authenticated;
DROP POLICY IF EXISTS "admins write audit" ON public.admin_audit_logs;
CREATE POLICY "admins write audit" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid()
  );

-- Policies and admin RPCs call has_role() as the signed-in user. Without
-- EXECUTE, SELECT/RETURNING on tables that use the admin policy throws
-- "permission denied for function has_role" even for the row owner.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
