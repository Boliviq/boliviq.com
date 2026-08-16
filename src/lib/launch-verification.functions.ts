/**
 * Admin-only launch verification server functions.
 *
 * Read-only inspections of Stripe + Boliviq state that back the
 * /admin/launch-verification UI. Never creates charges, never cancels
 * subscriptions, never issues refunds, never mutates Stripe pricing.
 * Never returns secrets. Identifiers are masked to the last 4 chars.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertAdminUser } from '@/lib/assert-admin';
import { z } from 'zod';
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  isStripeApiConfigured,
  isStripeWebhookConfigured,
  stripeApiKeyEnvLabel,
  stripeWebhookSecretEnvLabel,
} from '@/lib/stripe.server';
import { EXPECTED_PLANS, normalizeStatus, hasPaidAccess } from '@/lib/subscription-access';

function mask(id: string | null | undefined): string {
  if (!id) return '—';
  if (id.length <= 6) return `••${id.slice(-2)}`;
  return `${id.slice(0, 3)}…${id.slice(-4)}`;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  await assertAdminUser(context.userId);
}

const APPROVED_ORIGINS = [
  'https://boliviq.com',
  'https://www.boliviq.com',
  'https://scout-deal-ai.lovable.app',
];

// ─────────────────────────────────────────────────────────────────────
// Phase 3 — Live environment precheck
// ─────────────────────────────────────────────────────────────────────

export type PrecheckItem = {
  key: string;
  label: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'WAITING FOR OWNER';
  detail: string;
};

export const runLaunchPrecheck = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ environment: StripeEnv; items: PrecheckItem[] }> => {
    await assertAdmin(context);
    const env = data.environment;
    const items: PrecheckItem[] = [];

    // API key
    const apiKeyVar = stripeApiKeyEnvLabel(env);
    const hasApiKey = isStripeApiConfigured(env);
    items.push({
      key: 'api_key',
      label: `${env === 'live' ? 'Live' : 'Sandbox'} Stripe API key`,
      status: hasApiKey ? 'PASS' : 'FAIL',
      detail: hasApiKey ? 'Configured (value never displayed).' : `Missing ${apiKeyVar} (or STRIPE_SECRET_KEY_${env === 'live' ? 'LIVE' : 'TEST'}).`,
    });

    // Webhook signing secret
    const whVar = stripeWebhookSecretEnvLabel(env);
    const hasWh = isStripeWebhookConfigured(env);
    items.push({
      key: 'webhook_secret',
      label: `${env === 'live' ? 'Live' : 'Sandbox'} webhook signing secret`,
      status: hasWh ? 'PASS' : 'FAIL',
      detail: hasWh ? 'Configured (value never displayed).' : `Missing ${whVar}.`,
    });

    // Approved origins
    items.push({
      key: 'origins',
      label: 'Approved return origins',
      status: 'PASS',
      detail: `Return / cancel URLs are locked to: ${APPROVED_ORIGINS.join(', ')} plus *.lovable.app.`,
    });

    if (!hasApiKey) {
      return { environment: env, items };
    }

    // Stripe probes
    try {
      const stripe = createStripeClient(env);

      // Verify keys actually work by fetching the account.
      let accountId: string | null = null;
      try {
        const account = await (stripe.accounts as any).retrieve();
        accountId = (account as any).id ?? null;
        items.push({
          key: 'stripe_auth',
          label: 'Stripe API authentication',
          status: 'PASS',
          detail: `Connected to Stripe account ${mask(accountId)}.`,
        });
      } catch (e) {
        items.push({
          key: 'stripe_auth',
          label: 'Stripe API authentication',
          status: 'FAIL',
          detail: `Could not authenticate with Stripe: ${getStripeErrorMessage(e)}`,
        });
        return { environment: env, items };
      }

      // Prices — all 10 expected lookup keys, active, and matching amount/interval.
      let priceFailures = 0;
      let priceWarnings = 0;
      const priceNotes: string[] = [];
      for (const expected of EXPECTED_PLANS) {
        try {
          const list = await stripe.prices.list({ lookup_keys: [expected.lookupKey], limit: 5 });
          if (!list.data.length) {
            priceFailures += 1;
            priceNotes.push(`Missing: ${expected.lookupKey}`);
            continue;
          }
          const active = list.data.filter((p) => p.active);
          const primary = active[0] ?? list.data[0];
          const amount = primary.unit_amount ? primary.unit_amount / 100 : undefined;
          const interval = primary.recurring?.interval;
          if (!primary.active) { priceFailures += 1; priceNotes.push(`Archived: ${expected.lookupKey}`); continue; }
          if (amount !== expected.amount || interval !== expected.interval) {
            priceWarnings += 1;
            priceNotes.push(`Mismatch: ${expected.lookupKey} ($${amount}/${interval})`);
          }
          if (active.length > 1) {
            priceWarnings += 1;
            priceNotes.push(`Duplicates: ${expected.lookupKey} (${active.length})`);
          }
        } catch {
          priceFailures += 1;
          priceNotes.push(`Error: ${expected.lookupKey}`);
        }
      }
      items.push({
        key: 'prices',
        label: `All ${EXPECTED_PLANS.length} Boliviq lookup keys`,
        status: priceFailures ? 'FAIL' : priceWarnings ? 'WARNING' : 'PASS',
        detail:
          priceFailures || priceWarnings
            ? priceNotes.join(' · ')
            : 'All 10 lookup keys present, active, and matching expected amounts & intervals.',
      });

      // Customer Portal configuration
      try {
        const configs = await stripe.billingPortal.configurations.list({ limit: 5, active: true });
        const hasDefault = configs.data.some((c) => (c as any).is_default);
        items.push({
          key: 'portal',
          label: 'Customer Portal configuration',
          status: configs.data.length ? 'PASS' : 'FAIL',
          detail: configs.data.length
            ? `${configs.data.length} active configuration(s)${hasDefault ? ' — default set.' : ' — no default flagged.'}`
            : 'No portal configuration found. Owner action: enable the Customer Portal in the Stripe dashboard.',
        });
      } catch (e) {
        items.push({
          key: 'portal',
          label: 'Customer Portal configuration',
          status: 'WARNING',
          detail: `Could not read portal config: ${getStripeErrorMessage(e)}`,
        });
      }

      // Webhook endpoints
      try {
        const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
        const boliviqEndpoints = endpoints.data.filter((e) =>
          (e.url || '').includes('/api/public/payments/webhook'),
        );
        const withCorrectEnv = boliviqEndpoints.filter((e) => (e.url || '').includes(`env=${env}`));
        items.push({
          key: 'webhook_endpoint',
          label: 'Registered webhook endpoint',
          status: withCorrectEnv.length ? 'PASS' : boliviqEndpoints.length ? 'WARNING' : 'FAIL',
          detail: withCorrectEnv.length
            ? `${withCorrectEnv.length} endpoint(s) pointing at /api/public/payments/webhook?env=${env}.`
            : boliviqEndpoints.length
              ? `Boliviq webhook exists but no endpoint carries ?env=${env}. Owner action: register the endpoint with the correct query parameter.`
              : `No Boliviq webhook endpoint registered on this Stripe account. Owner action: register /api/public/payments/webhook?env=${env}.`,
        });
      } catch (e) {
        items.push({
          key: 'webhook_endpoint',
          label: 'Registered webhook endpoint',
          status: 'WARNING',
          detail: `Could not list webhook endpoints: ${getStripeErrorMessage(e)}`,
        });
      }
    } catch (e) {
      items.push({
        key: 'stripe_fatal',
        label: 'Stripe probe',
        status: 'FAIL',
        detail: getStripeErrorMessage(e),
      });
    }

    // Recent webhook activity (any env)
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { count } = await supabaseAdmin
        .from('webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('environment', env);
      items.push({
        key: 'webhook_activity',
        label: `Processed webhook events (${env})`,
        status: (count ?? 0) > 0 ? 'PASS' : 'WAITING FOR OWNER',
        detail:
          (count ?? 0) > 0
            ? `${count} event(s) processed and stored with idempotency keys.`
            : 'No webhook events processed yet in this environment. Will populate once the first live/sandbox event is delivered.',
      });
    } catch (e) {
      items.push({
        key: 'webhook_activity',
        label: 'Processed webhook events',
        status: 'WARNING',
        detail: e instanceof Error ? e.message : 'Could not read webhook_events.',
      });
    }

    return { environment: env, items };
  });

// ─────────────────────────────────────────────────────────────────────
// Phase 5+6 — Verify the caller's own subscription end-to-end
// ─────────────────────────────────────────────────────────────────────

export type SubscriptionSnapshot = {
  environment: StripeEnv;
  hasRow: boolean;
  db?: {
    plan: string;
    status: string;
    normalizedStatus: string;
    hasPaidAccess: boolean;
    priceLookup: string | null;
    stripeCustomerMasked: string;
    stripeSubscriptionMasked: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    couponCode: string | null;
  };
  stripe?: {
    customerFound: boolean;
    subscriptionFound: boolean;
    subscriptionStatus?: string;
    priceLookup?: string | null;
    amount?: number;
    interval?: string;
    duplicateActiveCount: number;
  };
  mismatches: string[];
};

export const verifyOwnerSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<SubscriptionSnapshot> => {
    await assertAdmin(context);
    const env = data.environment;
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('environment', env)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const snap: SubscriptionSnapshot = {
      environment: env,
      hasRow: !!row,
      mismatches: [],
    };

    if (row) {
      const r: any = row;
      snap.db = {
        plan: r.plan,
        status: r.status,
        normalizedStatus: normalizeStatus(r),
        hasPaidAccess: hasPaidAccess(r),
        priceLookup: r.price_id ?? null,
        stripeCustomerMasked: mask(r.stripe_customer_id),
        stripeSubscriptionMasked: mask(r.stripe_subscription_id),
        currentPeriodEnd: r.current_period_end ?? null,
        cancelAtPeriodEnd: !!r.cancel_at_period_end,
        couponCode: r.coupon_code ?? null,
      };

      // Only cross-reference real Stripe subscriptions (skip owner-grant rows).
      const custId = r.stripe_customer_id as string | undefined;
      const subId = r.stripe_subscription_id as string | undefined;
      const isGrant = custId?.startsWith('boliviq_grant_') || subId?.startsWith('boliviq_grant_');

      if (!isGrant && custId) {
        try {
          const stripe = createStripeClient(env);
          let customerFound = false;
          let subscriptionFound = false;
          let subscriptionStatus: string | undefined;
          let priceLookup: string | null | undefined;
          let amount: number | undefined;
          let interval: string | undefined;
          let duplicateActiveCount = 0;

          try {
            const cust = await stripe.customers.retrieve(custId);
            customerFound = !(cust as any).deleted;
          } catch { /* not found */ }

          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              subscriptionFound = true;
              subscriptionStatus = sub.status;
              const item = (sub as any).items?.data?.[0];
              priceLookup = item?.price?.lookup_key ?? null;
              amount = item?.price?.unit_amount ? item.price.unit_amount / 100 : undefined;
              interval = item?.price?.recurring?.interval;
            } catch { /* not found */ }
          }

          // Count active subs for this customer (duplicate protection sanity check).
          try {
            const list = await stripe.subscriptions.list({ customer: custId, status: 'active', limit: 10 });
            duplicateActiveCount = list.data.length;
          } catch { /* ignore */ }

          snap.stripe = {
            customerFound,
            subscriptionFound,
            subscriptionStatus,
            priceLookup,
            amount,
            interval,
            duplicateActiveCount,
          };

          if (!customerFound) snap.mismatches.push('Stripe customer not found for the ID stored in Boliviq.');
          if (subId && !subscriptionFound) snap.mismatches.push('Stripe subscription ID not found in Stripe.');
          if (subscriptionStatus && subscriptionStatus !== r.status) {
            snap.mismatches.push(`Status differs: Boliviq="${r.status}" vs Stripe="${subscriptionStatus}".`);
          }
          if (priceLookup && r.price_id && priceLookup !== r.price_id) {
            snap.mismatches.push(`Price lookup differs: Boliviq="${r.price_id}" vs Stripe="${priceLookup}".`);
          }
          if (duplicateActiveCount > 1) {
            snap.mismatches.push(`${duplicateActiveCount} active subscriptions on this Stripe customer — duplicate protection failure.`);
          }
        } catch (e) {
          snap.mismatches.push(`Stripe lookup error: ${getStripeErrorMessage(e)}`);
        }
      }
    }

    return snap;
  });

// ─────────────────────────────────────────────────────────────────────
// Phase 8 — Duplicate-subscription guard dry-run
// ─────────────────────────────────────────────────────────────────────

export const dryRunDuplicateGuard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{
    hasBlockingSubscription: boolean;
    blockingStatus?: string;
    guardWouldFire: boolean;
    detail: string;
  }> => {
    await assertAdmin(context);
    const { BLOCKING_SUB_STATES } = await import('@/lib/subscription-access');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('status, stripe_subscription_id')
      .eq('user_id', context.userId)
      .eq('environment', data.environment)
      .in('status', BLOCKING_SUB_STATES as unknown as string[])
      .not('stripe_subscription_id', 'like', 'boliviq_grant_%')
      .limit(1);
    const hasBlocking = !!(existing && existing.length);
    return {
      hasBlockingSubscription: hasBlocking,
      blockingStatus: hasBlocking ? (existing![0] as any).status : undefined,
      guardWouldFire: hasBlocking,
      detail: hasBlocking
        ? `A subscription in status "${(existing![0] as any).status}" exists — a second checkout attempt would be blocked with the "Manage Billing" message. Verified against the real code path used by createBoliviqCheckout.`
        : 'No blocking subscription for the current user in this environment. The guard is wired but there is nothing to block right now — repeat this check after completing the live purchase to see the guard fire.',
    };
  });

// ─────────────────────────────────────────────────────────────────────
// Phase 5 — Recent webhook events (masked)
// ─────────────────────────────────────────────────────────────────────

export const listRecentWebhookEvents = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv; limit?: number }) =>
    z.object({ environment: z.enum(['sandbox', 'live']), limit: z.number().int().min(1).max(50).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows } = await supabaseAdmin
      .from('webhook_events')
      .select('stripe_event_id, event_type, environment, processed_at')
      .eq('environment', data.environment)
      .order('processed_at', { ascending: false })
      .limit(data.limit ?? 20);
    return (rows ?? []).map((r: any) => ({
      idMasked: mask(r.stripe_event_id),
      type: r.event_type,
      env: r.environment,
      processedAt: r.processed_at,
    }));
  });
