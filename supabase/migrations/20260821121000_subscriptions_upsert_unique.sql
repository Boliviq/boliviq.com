-- PostgREST upserts with onConflict=stripe_subscription_id require a unique
-- constraint/index on that column without a partial WHERE predicate.
DROP INDEX IF EXISTS idx_subscriptions_stripe_id;
CREATE UNIQUE INDEX idx_subscriptions_stripe_id
  ON public.subscriptions (stripe_subscription_id);
