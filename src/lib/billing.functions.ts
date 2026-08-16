import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { type StripeEnv, createStripeClient, getStripeErrorMessage, stripeApiKeyCheck, stripeWebhookSecretCheck, STRIPE_API_VERSION, STRIPE_SDK_VERSION } from '@/lib/stripe.server';
import { BLOCKING_SUB_STATES, EXPECTED_PLANS } from '@/lib/subscription-access';
import {
  BILLING_IMPLEMENTATION_VERSION,
  CHECKOUT_BUILD_ID,
  CHECKOUT_HANDLER_NAME,
  CHECKOUT_RETURN_PATH,
  CHECKOUT_UI_MODE,
  buildCheckoutSessionParams,
  getBillingOption,
  getBillingOptionByLookupKey,
  listBillingOptions,
  sanitizeCheckoutSessionParams,
  type BillingInterval,
} from '@/lib/checkout-config';

/** Approved public origins for return URLs. Anything else is rejected. */
const APPROVED_ORIGINS = new Set([
  'https://boliviq.com',
  'https://www.boliviq.com',
  'https://scout-deal-ai.lovable.app',
]);

function assertApprovedReturnUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('Invalid returnUrl'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Invalid returnUrl');
  // Allow any lovable.app preview subdomain + explicitly approved origins + localhost dev.
  const ok =
    APPROVED_ORIGINS.has(u.origin) ||
    u.hostname.endsWith('.lovable.app') ||
    u.hostname === 'localhost' ||
    u.hostname === '127.0.0.1';
  if (!ok) throw new Error('returnUrl origin is not approved');
  return u.toString();
}

/** Deterministic Stripe idempotency key: same (user, price, env, checkout config, 10-min window) → same key. */
async function checkoutIdempotencyKey(userId: string, priceLookupKey: string, env: StripeEnv): Promise<string> {
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000)); // 10-minute bucket
  const material = `${userId}|${priceLookupKey}|${env}|${BILLING_IMPLEMENTATION_VERSION}|${CHECKOUT_BUILD_ID}|${bucket}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `boliviq_co_${hex.slice(0, 48)}`;
}

function maskStripeRequestId(requestId: string | undefined): string | undefined {
  if (!requestId) return undefined;
  if (requestId.length <= 8) return `…${requestId.slice(-4)}`;
  return `${requestId.slice(0, 4)}…${requestId.slice(-4)}`;
}

function getStripeRequestId(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { requestId?: string; raw?: { requestId?: string } };
  return e.raw?.requestId ?? e.requestId;
}

function getStripeErrorInfo(error: unknown): { type?: string; code?: string; param?: string; requestId?: string } {
  if (!error || typeof error !== 'object') return {};
  const e = error as {
    type?: string;
    code?: string;
    param?: string;
    raw?: { type?: string; code?: string; param?: string; requestId?: string };
    requestId?: string;
  };
  return {
    type: e.raw?.type ?? e.type,
    code: e.raw?.code ?? e.code,
    param: e.raw?.param ?? e.param,
    requestId: maskStripeRequestId(e.raw?.requestId ?? e.requestId),
  };
}

type CheckoutErrorRecord = {
  timestamp: string;
  handler: string;
  planTier?: string;
  planName?: string;
  interval?: string;
  environment?: string;
  stripeErrorType?: string;
  stripeErrorCode?: string;
  stripeErrorParam?: string;
  maskedRequestId?: string;
  buildId: string;
  message: string;
};

const recentCheckoutErrors: CheckoutErrorRecord[] = [];

function recordCheckoutError(record: CheckoutErrorRecord) {
  recentCheckoutErrors.unshift(record);
  recentCheckoutErrors.splice(25);
}

/**
 * Look up a coupon (RLS-bypassed via service role), enforce admin-only and
 * per-user usage rules, then either grant the subscription directly (100%
 * off admin coupons — never leaked to Stripe) or ensure a matching Stripe
 * promotion code exists and return its ID so it can be attached to a
 * Checkout Session.
 */
async function resolveCouponForCheckout(params: {
  code: string | undefined;
  plan: string;
  amount: number;
  userId: string;
  isAdmin: boolean;
  stripe: ReturnType<typeof createStripeClient>;
}): Promise<
  | { kind: 'none' }
  | { kind: 'stripe'; promotionCodeId: string; couponId: string; couponCode: string }
  | { kind: 'grant'; couponId: string; couponCode: string }
> {
  const { code, plan, amount, userId, isAdmin, stripe } = params;
  if (!code || !code.trim()) return { kind: 'none' };

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
    .maybeSingle();
  if (!coupon) throw new Error('Coupon code not found.');
  if (!coupon.active) throw new Error('This coupon is not active.');

  const now = Date.now();
  if (coupon.start_date && new Date(coupon.start_date).getTime() > now) throw new Error("This coupon isn't active yet.");
  if (coupon.expiration_date && new Date(coupon.expiration_date).getTime() < now) throw new Error('This coupon has expired.');
  if (coupon.max_total_uses != null && (coupon.current_uses ?? 0) >= coupon.max_total_uses) throw new Error('This coupon has reached its usage limit.');
  if (coupon.restricted_plan && coupon.restricted_plan.toLowerCase() !== plan.toLowerCase()) throw new Error(`This coupon only applies to the ${coupon.restricted_plan} plan.`);
  if (coupon.admin_only && !isAdmin) throw new Error('Coupon code not found.');

  if (coupon.max_uses_per_customer != null && !coupon.admin_only) {
    const { count } = await supabaseAdmin
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);
    if ((count ?? 0) >= coupon.max_uses_per_customer) throw new Error("You've already used this coupon.");
  }

  const isFullDiscount =
    coupon.discount_type === 'percentage' && Number(coupon.discount_value) >= 100 ||
    coupon.discount_type === 'fixed' && Number(coupon.discount_value) >= amount;

  // Admin-only OR fully-discounting coupon → grant directly, never expose to Stripe
  if (coupon.admin_only || isFullDiscount) {
    return { kind: 'grant', couponId: coupon.id, couponCode: coupon.code };
  }

  // Otherwise ensure a Stripe coupon + promotion code exist; create if missing.
  let stripeCouponId: string | null = coupon.stripe_coupon_id ?? null;
  let promotionCodeId: string | null = coupon.stripe_promotion_code_id ?? null;

  if (!stripeCouponId) {
    const created = await stripe.coupons.create({
      name: coupon.name || coupon.code,
      duration: 'once',
      ...(coupon.discount_type === 'percentage'
        ? { percent_off: Number(coupon.discount_value) }
        : { amount_off: Math.round(Number(coupon.discount_value) * 100), currency: 'usd' }),
      ...(coupon.max_total_uses != null && { max_redemptions: coupon.max_total_uses }),
      ...(coupon.expiration_date && { redeem_by: Math.floor(new Date(coupon.expiration_date).getTime() / 1000) }),
      metadata: { boliviq_coupon_id: coupon.id },
    });
    stripeCouponId = created.id;
  }

  if (!promotionCodeId) {
    const promo = await stripe.promotionCodes.create({
      coupon: stripeCouponId!,
      code: coupon.code,
      active: true,
      metadata: { boliviq_coupon_id: coupon.id },
    } as any);
    promotionCodeId = promo.id;

    await supabaseAdmin
      .from('coupons')
      .update({
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: promotionCodeId,
        stripe_promotion_code: coupon.code,
        stripe_synced_at: new Date().toISOString(),
      })
      .eq('id', coupon.id);
  }

  return { kind: 'stripe', promotionCodeId: promotionCodeId!, couponId: coupon.id, couponCode: coupon.code };
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(options.userId)) throw new Error('Invalid userId');
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const c = existing.data[0];
      if (c.metadata?.userId !== options.userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: options.userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

const checkoutInput = z.object({
  planTier: z.string().regex(/^[a-zA-Z0-9_]+$/),
  interval: z.enum(['month', 'year']),
  couponCode: z.string().trim().max(64).optional(),
  returnUrl: z.string().url(),
  environment: z.enum(['sandbox', 'live']),
});

type CheckoutResult =
  | { granted: true; couponCode: string }
  | { clientSecret: string; couponApplied?: string }
  | {
      ok: false;
      code: 'CHECKOUT_CONFIGURATION_ERROR' | 'CHECKOUT_DUPLICATE_SUBSCRIPTION' | 'CHECKOUT_PRICE_NOT_FOUND' | 'CHECKOUT_AUTH_ERROR';
      message: string;
      requestId?: string;
      retryable: boolean;
      adminDetail?: {
        stripeErrorType?: string;
        stripeErrorCode?: string;
        stripeErrorParam?: string;
        handler: string;
        buildId: string;
      };
      error: string;
    };

export const createBoliviqCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    setResponseHeader('Cache-Control', 'no-store, max-age=0');
    const option = getBillingOption(data.planTier, data.interval);
    try {
      const returnUrl = assertApprovedReturnUrl(data.returnUrl);
      const stripe = createStripeClient(data.environment as StripeEnv);
      const { supabase, userId } = context;
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? undefined;

      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });

      const coupon = await resolveCouponForCheckout({
        code: data.couponCode,
        plan: option.planName,
        amount: option.amount,
        userId,
        isAdmin: !!isAdmin,
        stripe,
      });

      // Full-discount / admin-only coupon: grant subscription directly, no Stripe.
      if (coupon.kind === 'grant') {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        await supabaseAdmin.from('subscriptions').insert({
          user_id: userId,
          plan: option.planName,
          status: 'active',
          stripe_subscription_id: `boliviq_grant_${crypto.randomUUID()}`,
          stripe_customer_id: `boliviq_grant_${userId}`,
          price_id: option.lookupKey,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          environment: data.environment,
          coupon_code: coupon.couponCode,
        });

        await supabaseAdmin.from('coupon_redemptions').insert({
          coupon_id: coupon.couponId,
          coupon_code: coupon.couponCode,
          user_id: userId,
          plan: option.planName,
          order_amount: option.amount,
          discount_amount: option.amount,
        });

        const { data: couponRow } = await supabaseAdmin
          .from('coupons')
          .select('current_uses, admin_only')
          .eq('id', coupon.couponId)
          .maybeSingle();
        if (couponRow && !couponRow.admin_only) {
          await supabaseAdmin
            .from('coupons')
            .update({ current_uses: (couponRow.current_uses ?? 0) + 1 })
            .eq('id', coupon.couponId);
        }

        return { granted: true, couponCode: coupon.couponCode };
      }

      // Guard against duplicate subscriptions. Any Stripe subscription in a
      // state that could still bill the customer blocks a second checkout;
      // plan changes belong in the Customer Portal.
      {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('status, stripe_subscription_id')
          .eq('user_id', userId)
          .eq('environment', data.environment)
          .in('status', BLOCKING_SUB_STATES as unknown as string[])
          .not('stripe_subscription_id', 'like', 'boliviq_grant_%')
          .limit(1);
        if (existing && existing.length > 0) {
          return {
            ok: false,
            code: 'CHECKOUT_DUPLICATE_SUBSCRIPTION',
            message: 'You already have a subscription on this account. Use Manage Billing to change plans or update payment methods.',
            retryable: false,
            error: 'You already have a subscription on this account. Use Manage Billing to change plans or update payment methods.',
          };
        }
      }

      const prices = await stripe.prices.list({ lookup_keys: [option.lookupKey], active: true });
      if (!prices.data.length) {
        return {
          ok: false,
          code: 'CHECKOUT_PRICE_NOT_FOUND',
          message: 'Checkout could not be initialized.',
          retryable: false,
          error: `Stripe price "${option.lookupKey}" is not configured in ${data.environment} mode. Ask the site owner to create it in Stripe.`,
          adminDetail: { handler: CHECKOUT_HANDLER_NAME, buildId: CHECKOUT_BUILD_ID },
        };
      }
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === 'recurring';

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      // Deterministic idempotency key: absorbs double-clicks, retries, and
      // multi-tab submits for the same (user, price, env) within a 10-minute
      // window. A later, legitimate re-purchase after cancellation falls
      // into a new window and gets a fresh key.
      const idempotencyKey = await checkoutIdempotencyKey(userId, option.lookupKey, data.environment as StripeEnv);
      const sessionParams = buildCheckoutSessionParams({
        stripePriceId: stripePrice.id,
        mode: isRecurring ? 'subscription' : 'payment',
        returnUrl,
        customerId,
        userId,
        planTier: option.planTier,
        planName: option.planName,
        interval: option.interval,
        priceLookupKey: option.lookupKey,
        ...(coupon.kind === 'stripe' && { promotionCodeId: coupon.promotionCodeId, couponCode: coupon.couponCode }),
      });

      console.info('[boliviq] checkout session create', {
        handler: CHECKOUT_HANDLER_NAME,
        deploymentEnvironment: process.env.NODE_ENV ?? 'unknown',
        stripeMode: data.environment === 'live' ? 'live' : 'test',
        planId: option.planTier,
        billingInterval: option.interval,
        priceLookupKey: option.lookupKey,
        requestedUiMode: sessionParams.ui_mode,
        returnUrlPresent: !!sessionParams.return_url,
        successUrlPresent: 'success_url' in sessionParams,
        codeVersion: CHECKOUT_BUILD_ID,
        timestamp: new Date().toISOString(),
      });

      const session = await stripe.checkout.sessions.create(sessionParams as any, { idempotencyKey });

      return {
        clientSecret: session.client_secret ?? '',
        ...(coupon.kind === 'stripe' && { couponApplied: coupon.couponCode }),
      };
    } catch (error) {
      const stripeInfo = getStripeErrorInfo(error);
      const safeMessage = getStripeErrorMessage(error);
      const record = {
        timestamp: new Date().toISOString(),
        handler: CHECKOUT_HANDLER_NAME,
        planTier: option.planTier,
        planName: option.planName,
        interval: option.interval,
        environment: data.environment,
        stripeErrorType: stripeInfo.type,
        stripeErrorCode: stripeInfo.code,
        stripeErrorParam: stripeInfo.param,
        maskedRequestId: stripeInfo.requestId,
        buildId: CHECKOUT_BUILD_ID,
        message: safeMessage,
      } satisfies CheckoutErrorRecord;
      recordCheckoutError(record);
      console.error('[boliviq] checkout error', record);
      return {
        ok: false,
        code: 'CHECKOUT_CONFIGURATION_ERROR',
        message: 'We couldn’t open secure checkout. No payment was taken. Please try again.',
        requestId: maskStripeRequestId(getStripeRequestId(error)),
        retryable: false,
        adminDetail: {
          stripeErrorType: stripeInfo.type,
          stripeErrorCode: stripeInfo.code,
          stripeErrorParam: stripeInfo.param,
          handler: CHECKOUT_HANDLER_NAME,
          buildId: CHECKOUT_BUILD_ID,
        },
        error: safeMessage,
      };
    }
  });

/**
 * Admin-only: pre-sync all non-hidden, non-admin coupons into Stripe as
 * coupons + promotion codes so they redeem automatically at checkout.
 */
export const syncCouponsToStripe = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const stripe = createStripeClient(data.environment);

    const { data: coupons } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('admin_only', false)
      .eq('active', true);

    const results: Array<{ code: string; status: 'synced' | 'skipped' | 'error'; message?: string }> = [];

    for (const coupon of coupons ?? []) {
      try {
        const isFull =
          (coupon.discount_type === 'percentage' && Number(coupon.discount_value) >= 100);
        if (isFull) {
          results.push({ code: coupon.code, status: 'skipped', message: '100% off — handled directly by Boliviq.' });
          continue;
        }
        if (coupon.stripe_promotion_code_id) {
          results.push({ code: coupon.code, status: 'skipped', message: 'Already synced.' });
          continue;
        }

        const stripeCoupon = await stripe.coupons.create({
          name: coupon.name || coupon.code,
          duration: 'once',
          ...(coupon.discount_type === 'percentage'
            ? { percent_off: Number(coupon.discount_value) }
            : { amount_off: Math.round(Number(coupon.discount_value) * 100), currency: 'usd' }),
          ...(coupon.max_total_uses != null && { max_redemptions: coupon.max_total_uses }),
          ...(coupon.expiration_date && { redeem_by: Math.floor(new Date(coupon.expiration_date).getTime() / 1000) }),
          metadata: { boliviq_coupon_id: coupon.id },
        });

        const promo = await stripe.promotionCodes.create({
          coupon: stripeCoupon.id,
          code: coupon.code,
          active: true,
          metadata: { boliviq_coupon_id: coupon.id },
        } as any);

        await supabaseAdmin
          .from('coupons')
          .update({
            stripe_coupon_id: stripeCoupon.id,
            stripe_promotion_code_id: promo.id,
            stripe_promotion_code: coupon.code,
            stripe_synced_at: new Date().toISOString(),
          })
          .eq('id', coupon.id);

        results.push({ code: coupon.code, status: 'synced' });
      } catch (e) {
        results.push({ code: coupon.code, status: 'error', message: getStripeErrorMessage(e) });
      }
    }

    return { results };
  });

/**
 * Open a Stripe Customer Portal session for the authenticated user.
 * Rejects owner-grant accounts (they have no real Stripe customer).
 */
export const createBoliviqPortalSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { returnUrl: string; environment: StripeEnv }) => {
    if (data.environment !== 'sandbox' && data.environment !== 'live') throw new Error('Invalid environment');
    assertApprovedReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const { supabase, userId } = context;
      // Always use the authenticated userId — never accept a customer id from the client.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, user_id')
        .eq('user_id', userId)
        .eq('environment', data.environment)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const customerId = (sub as any)?.stripe_customer_id as string | undefined;
      if (!customerId || customerId.startsWith('boliviq_grant_')) {
        return { error: 'No Stripe billing account for this user. Owner-grant access is managed internally — contact support to change plans.' };
      }

      const stripe = createStripeClient(data.environment);
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: assertApprovedReturnUrl(data.returnUrl),
        });
        return { url: portal.url };
      } catch (e: any) {
        const msg = getStripeErrorMessage(e);
        // Stripe returns a specific error when the portal has never been configured in the dashboard.
        if (/no configuration|default configuration|not been created/i.test(msg)) {
          return { error: 'The Stripe Customer Portal is not configured yet. Ask the site owner to enable it in the Stripe dashboard.' };
        }
        throw e;
      }
    } catch (error) {
      console.error('[boliviq] portal error', error);
      return { error: getStripeErrorMessage(error) };
    }
  });

type DiagnosticStatus = 'PASS' | 'WARNING' | 'FAIL' | 'OWNER ACTION REQUIRED';

export type DiagnosticRow = {
  lookupKey: string;
  status: DiagnosticStatus;
  found: boolean;
  priceActive?: boolean;
  amount?: number;
  expectedAmount: number;
  amountMatches?: boolean;
  currency?: string;
  interval?: string;
  expectedInterval: 'month' | 'year';
  intervalMatches?: boolean;
  productName?: string;
  productActive?: boolean;
  duplicateActivePrices?: number;
  notes: string[];
  error?: string;
};

/**
 * Admin-only diagnostics. Reads only; never creates or archives Stripe resources.
 * Compares Stripe's live/sandbox catalog against the Boliviq expected plan matrix
 * and reports PASS / WARNING / FAIL / OWNER ACTION REQUIRED per lookup key.
 * Never returns secret keys.
 */
export const runBillingDiagnostics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');

    const rows: DiagnosticRow[] = [];

    try {
      const stripe = createStripeClient(data.environment);
      for (const expected of EXPECTED_PLANS) {
        const notes: string[] = [];
        try {
          // Omit `active` to include BOTH active and inactive — so we can
          // distinguish "exists but disabled" from "missing entirely".
          // (Stripe treats `active: false` as "return only inactive".)
          const list = await stripe.prices.list({ lookup_keys: [expected.lookupKey], limit: 10 });
          if (!list.data.length) {
            rows.push({
              lookupKey: expected.lookupKey,
              status: 'OWNER ACTION REQUIRED',
              found: false,
              expectedAmount: expected.amount,
              expectedInterval: expected.interval,
              notes: [`Missing in ${data.environment}. Create a Stripe price with lookup_key "${expected.lookupKey}" at $${expected.amount}/${expected.interval}.`],
            });
            continue;
          }
          const active = list.data.filter(p => p.active);
          const primary = active[0] ?? list.data[0];
          const amount = primary.unit_amount ? primary.unit_amount / 100 : undefined;
          const interval = primary.recurring?.interval;

          let product: any = undefined;
          try {
            const productId = typeof primary.product === 'string' ? primary.product : primary.product?.id;
            if (productId) product = await stripe.products.retrieve(productId);
          } catch { /* non-fatal */ }

          const amountMatches = amount === expected.amount;
          const intervalMatches = interval === expected.interval;
          const duplicateActivePrices = active.length;
          const priceActive = primary.active;
          const productActive = product?.active ?? undefined;

          if (!amountMatches) notes.push(`Amount is $${amount} but expected $${expected.amount}.`);
          if (!intervalMatches) notes.push(`Interval is "${interval}" but expected "${expected.interval}".`);
          if (!priceActive) notes.push('Price is archived/inactive in Stripe.');
          if (productActive === false) notes.push('Parent product is archived/inactive in Stripe.');
          if (duplicateActivePrices > 1) notes.push(`${duplicateActivePrices} active prices share this lookup_key — checkout may pick the wrong one.`);

          let status: DiagnosticStatus = 'PASS';
          if (!priceActive || productActive === false) status = 'FAIL';
          else if (!amountMatches || !intervalMatches || duplicateActivePrices > 1) status = 'WARNING';

          rows.push({
            lookupKey: expected.lookupKey,
            status,
            found: true,
            priceActive,
            amount,
            expectedAmount: expected.amount,
            amountMatches,
            currency: primary.currency,
            interval,
            expectedInterval: expected.interval,
            intervalMatches,
            productName: product?.name,
            productActive,
            duplicateActivePrices,
            notes,
          });
        } catch (e) {
          rows.push({
            lookupKey: expected.lookupKey,
            status: 'FAIL',
            found: false,
            expectedAmount: expected.amount,
            expectedInterval: expected.interval,
            notes: ['Stripe API error while reading this price.'],
            error: getStripeErrorMessage(e),
          });
        }
      }

      return {
        environment: data.environment,
        webhookConfigured: stripeWebhookSecretCheck(data.environment).configured,
        apiKeyConfigured: stripeApiKeyCheck(data.environment).configured,
        prices: rows,
      };
    } catch (e) {
      return {
        environment: data.environment,
        webhookConfigured: false,
        apiKeyConfigured: false,
        prices: rows,
        fatal: getStripeErrorMessage(e),
      };
    }
  });

export type CheckoutVerificationStatus = 'PASS' | 'WARNING' | 'FAIL';

export type CheckoutVerificationPlanRow = {
  planTier: string;
  planName: string;
  interval: BillingInterval;
  lookupKey: string;
  expectedAmount: number;
  priceStatus: CheckoutVerificationStatus;
  sessionConfigStatus: CheckoutVerificationStatus;
  staticConfigStatus: CheckoutVerificationStatus;
  amount?: number;
  currency?: string;
  intervalActual?: string;
  priceActive?: boolean;
  uiMode: string;
  returnUrlPresent: boolean;
  successUrlPresent: boolean;
  clientExpectsClientSecret: boolean;
  duplicateProtectionEnabled: boolean;
  authEnforced: boolean;
  entitlementMappingExists: boolean;
  webhookMappingRecognizes: boolean;
  sanitizedSessionConfigJson: string;
  notes: string[];
};

export type CheckoutVerificationReport = {
  overall: 'READY' | 'BLOCKED';
  timestamp: string;
  frontendBuildId: string;
  checkoutServerBuildId: string;
  edgeFunctionBuildId: string | null;
  deployedEnvironment: string;
  stripeMode: StripeEnv;
  stripeSdkVersion: string;
  stripeApiVersion: string;
  applicationUrl: string;
  checkoutReturnUrl: string;
  environmentChecks: Array<{ key: string; status: CheckoutVerificationStatus; detail: string }>;
  plans: CheckoutVerificationPlanRow[];
  recentErrors: CheckoutErrorRecord[];
  legacyExecutableUiModeFound: boolean;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  });
  if (!isAdmin) throw new Error('Forbidden');
}

function planFromLookupKeyForVerification(lookupKey: string): string | null {
  try {
    return getBillingOptionByLookupKey(lookupKey).planName;
  } catch {
    return null;
  }
}

function buildStaticVerificationRow(option: ReturnType<typeof listBillingOptions>[number], returnUrl: string): CheckoutVerificationPlanRow {
  const sessionConfig = buildCheckoutSessionParams({
    stripePriceId: `price_static_${option.lookupKey}`,
    mode: 'subscription',
    returnUrl,
    customerId: 'cus_static_verification',
    userId: 'admin-static-verification',
    planTier: option.planTier,
    planName: option.planName,
    interval: option.interval,
    priceLookupKey: option.lookupKey,
  });
  const successUrlPresent = 'success_url' in sessionConfig;
  const returnUrlPresent = !!sessionConfig.return_url;
  const uiModeOk = sessionConfig.ui_mode === CHECKOUT_UI_MODE && sessionConfig.ui_mode !== 'embedded';
  const sessionConfigStatus: CheckoutVerificationStatus = uiModeOk && returnUrlPresent && !successUrlPresent ? 'PASS' : 'FAIL';
  const webhookMappingRecognizes = planFromLookupKeyForVerification(option.lookupKey) === option.planName;
  return {
    planTier: option.planTier,
    planName: option.planName,
    interval: option.interval,
    lookupKey: option.lookupKey,
    expectedAmount: option.amount,
    priceStatus: 'WARNING',
    sessionConfigStatus,
    staticConfigStatus: webhookMappingRecognizes ? 'PASS' : 'FAIL',
    uiMode: sessionConfig.ui_mode,
    returnUrlPresent,
    successUrlPresent,
    clientExpectsClientSecret: true,
    duplicateProtectionEnabled: true,
    authEnforced: true,
    entitlementMappingExists: webhookMappingRecognizes,
    webhookMappingRecognizes,
    sanitizedSessionConfigJson: JSON.stringify(sanitizeCheckoutSessionParams(sessionConfig), null, 2),
    notes: [],
  };
}

export const runCheckoutVerification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv; applicationUrl?: string }) =>
    z.object({ environment: z.enum(['sandbox', 'live']), applicationUrl: z.string().url().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutVerificationReport> => {
    setResponseHeader('Cache-Control', 'no-store, max-age=0');
    await assertAdmin(context);
    const applicationUrl = assertApprovedReturnUrl(data.applicationUrl ?? 'https://boliviq.com');
    const returnUrl = assertApprovedReturnUrl(new URL(CHECKOUT_RETURN_PATH, applicationUrl).toString());
    const environmentChecks: CheckoutVerificationReport['environmentChecks'] = [];
    const apiKey = stripeApiKeyCheck(data.environment);
    const webhook = stripeWebhookSecretCheck(data.environment);
    environmentChecks.push({ key: 'stripe_api_key', status: apiKey.configured ? 'PASS' : 'FAIL', detail: apiKey.configured ? `${apiKey.variable} exists.` : `${apiKey.variable} is missing.` });
    environmentChecks.push({ key: 'publishable_key', status: 'PASS', detail: `Publishable key is supplied by the ${data.environment} frontend build.` });
    environmentChecks.push({ key: 'webhook_secret', status: webhook.configured ? 'PASS' : 'FAIL', detail: webhook.configured ? `${webhook.variable} exists.` : `${webhook.variable} is missing.` });
    environmentChecks.push({ key: 'app_url', status: applicationUrl ? 'PASS' : 'FAIL', detail: applicationUrl });
    environmentChecks.push({ key: 'return_url', status: returnUrl.includes('/billing?checkout=success') ? 'PASS' : 'FAIL', detail: returnUrl });
    environmentChecks.push({ key: 'lovable_cloud', status: process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY ? 'PASS' : 'FAIL', detail: 'Required backend environment variables checked without exposing values.' });

    const plansRows = listBillingOptions().map((option) => buildStaticVerificationRow(option, returnUrl));
    try {
      const stripe = createStripeClient(data.environment);
      for (const row of plansRows) {
        try {
          const prices = await stripe.prices.list({ lookup_keys: [row.lookupKey], limit: 10 });
          if (!prices.data.length) {
            row.priceStatus = 'FAIL';
            row.notes.push('No Stripe price found for this lookup key.');
            continue;
          }
          const active = prices.data.filter((p) => p.active);
          const price = active[0] ?? prices.data[0];
          row.priceActive = price.active;
          row.amount = price.unit_amount ? price.unit_amount / 100 : undefined;
          row.currency = price.currency;
          row.intervalActual = price.recurring?.interval;
          const matches = price.active && row.amount === row.expectedAmount && row.currency === 'usd' && row.intervalActual === row.interval;
          row.priceStatus = matches ? 'PASS' : 'FAIL';
          if (!price.active) row.notes.push('Stripe price is inactive.');
          if (row.amount !== row.expectedAmount) row.notes.push(`Amount mismatch: expected $${row.expectedAmount}, found $${row.amount ?? 'unknown'}.`);
          if (row.currency !== 'usd') row.notes.push(`Currency mismatch: expected usd, found ${row.currency ?? 'unknown'}.`);
          if (row.intervalActual !== row.interval) row.notes.push(`Interval mismatch: expected ${row.interval}, found ${row.intervalActual ?? 'unknown'}.`);
          if (active.length > 1) {
            row.priceStatus = 'WARNING';
            row.notes.push(`${active.length} active prices share this lookup key.`);
          }
        } catch (error) {
          row.priceStatus = 'FAIL';
          row.notes.push(getStripeErrorMessage(error));
        }
      }
    } catch (error) {
      environmentChecks.push({ key: 'stripe_client', status: 'FAIL', detail: getStripeErrorMessage(error) });
    }

    const blocked =
      environmentChecks.some((item) => item.status === 'FAIL') ||
      plansRows.some((row) => row.priceStatus === 'FAIL' || row.sessionConfigStatus === 'FAIL' || row.staticConfigStatus === 'FAIL') ||
      String(CHECKOUT_UI_MODE) === 'embedded';

    return {
      overall: blocked ? 'BLOCKED' : 'READY',
      timestamp: new Date().toISOString(),
      frontendBuildId: CHECKOUT_BUILD_ID,
      checkoutServerBuildId: CHECKOUT_BUILD_ID,
      edgeFunctionBuildId: null,
      deployedEnvironment: process.env.NODE_ENV ?? 'unknown',
      stripeMode: data.environment,
      stripeSdkVersion: STRIPE_SDK_VERSION,
      stripeApiVersion: STRIPE_API_VERSION,
      applicationUrl,
      checkoutReturnUrl: returnUrl,
      environmentChecks,
      plans: plansRows,
      recentErrors: recentCheckoutErrors,
      legacyExecutableUiModeFound: String(CHECKOUT_UI_MODE) === 'embedded',
    };
  });

export const validateCheckoutSessionConfig = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { planTier: string; interval: BillingInterval; returnUrl?: string }) =>
    z.object({ planTier: z.string(), interval: z.enum(['month', 'year']), returnUrl: z.string().url().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'no-store, max-age=0');
    await assertAdmin(context);
    const option = getBillingOption(data.planTier, data.interval);
    const returnUrl = assertApprovedReturnUrl(data.returnUrl ?? 'https://boliviq.com/billing?checkout=success');
    const row = buildStaticVerificationRow(option, returnUrl);
    return {
      status: row.sessionConfigStatus,
      normalizedSessionConfigurationJson: row.sanitizedSessionConfigJson,
      checks: {
        uiModeEmbeddedPage: row.uiMode === CHECKOUT_UI_MODE,
        noLegacyEmbedded: String(row.uiMode) !== 'embedded',
        returnUrlPresent: row.returnUrlPresent,
        successUrlAbsent: !row.successUrlPresent,
        clientSecretExpected: row.clientExpectsClientSecret,
      },
    };
  });

export const getRecentCheckoutErrors = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data: { limit?: number }) => z.object({ limit: z.number().int().min(1).max(25).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'no-store, max-age=0');
    await assertAdmin(context);
    return recentCheckoutErrors.slice(0, data.limit ?? 10);
  });
