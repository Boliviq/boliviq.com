-- has_role is used by RLS policies (coupons, webhook_events) and by server
-- functions. Revoking EXECUTE from authenticated made those policies error
-- and broke supabase.rpc('has_role') on the user JWT client.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Subscriptions must only be written by service role (Stripe webhook / grants).
-- The previous FOR ALL policy let any signed-in user insert a paid row.
DROP POLICY IF EXISTS "own subs" ON public.subscriptions;

CREATE POLICY "users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
