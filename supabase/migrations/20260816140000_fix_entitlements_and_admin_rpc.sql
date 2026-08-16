-- Entitlement rows must be written only by the service role (Stripe webhook /
-- admin grant). Authenticated users may read their own subscription, not mint one.
DROP POLICY IF EXISTS "own subs" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Webhook upserts use ON CONFLICT (stripe_subscription_id). A partial unique
-- index is not a valid inference target for PostgREST upserts, so replace it
-- with a real unique constraint (PostgreSQL still allows multiple NULLs).
DROP INDEX IF EXISTS idx_subscriptions_stripe_id;
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);

-- has_role EXECUTE was revoked from PUBLIC/authenticated. Restore service_role
-- so server-side admin checks can still use it, and add a caller-bound wrapper
-- that authenticated clients may call without probing other users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
