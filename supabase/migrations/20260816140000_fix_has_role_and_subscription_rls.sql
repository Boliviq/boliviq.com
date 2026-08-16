-- Restore EXECUTE on has_role: coupon RLS policies call it as the current
-- authenticated user, and server functions call it via supabase.rpc().
-- The previous revoke from authenticated broke admin checks and coupon SELECT.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Align SQL entitlement helper with src/lib/subscription-access.ts
-- (past_due keeps access while Stripe retries; owner grants use boliviq_grant_ ids).
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'sandbox'
) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        status IN ('active', 'trialing', 'past_due')
        OR stripe_customer_id LIKE 'boliviq_grant_%'
        OR (status = 'canceled' AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  );
$$;

-- Subscriptions must only be written by the service role (webhook / grant flow).
-- Authenticated users could previously insert a fake paid row via RLS FOR ALL.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "own subs" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
