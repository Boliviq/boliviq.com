import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, createStripeClient, verifyWebhook } from '@/lib/stripe.server';
import {
  couponPlanFromCheckoutSession,
  isUniqueViolation,
  planFromPrice,
  stripeId,
  subscriptionIdFromCheckoutSession,
  subscriptionIdFromInvoice,
} from '@/lib/billing-mapping';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service role is not configured');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) { console.error('No userId in subscription metadata'); return; }
  const item = subscription.items?.data?.[0];
  const priceLookup = item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.id;
  const productId = stripeId(item?.price?.product);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const customerId = stripeId(subscription.customer);
  if (!customerId) {
    console.error('Subscription missing customer id', subscription.id);
    return;
  }

  const { error } = await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    plan: planFromPrice(item?.price) ?? 'Unknown',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    product_id: productId,
    price_id: priceLookup ?? null,
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    environment: env,
    coupon_code: subscription.metadata?.boliviq_coupon ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
  if (error) throw error;
}

async function markCanceled(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
  if (error) throw error;
}

async function logCouponRedemption(session: any) {
  const userId = session.metadata?.userId;
  const couponCode = session.metadata?.boliviq_coupon;
  if (!userId || !couponCode) return;

  const supabase = getSupabase();
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, current_uses')
    .ilike('code', couponCode)
    .maybeSingle();
  if (!coupon) return;

  const orderAmount = ((session.amount_subtotal ?? 0) as number) / 100;
  const totalPaid = ((session.amount_total ?? 0) as number) / 100;
  const discount = Math.max(0, +(orderAmount - totalPaid).toFixed(2));

  const { error: redemptionError } = await supabase.from('coupon_redemptions').insert({
    coupon_id: (coupon as any).id,
    coupon_code: couponCode,
    user_id: userId,
    plan: couponPlanFromCheckoutSession(session),
    order_amount: orderAmount,
    discount_amount: discount,
  });
  if (redemptionError) {
    if (isUniqueViolation(redemptionError)) return;
    throw redemptionError;
  }

  const { error: usageError } = await supabase
    .from('coupons')
    .update({ current_uses: (((coupon as any).current_uses ?? 0) as number) + 1 })
    .eq('id', (coupon as any).id);
  if (usageError) throw usageError;
}

async function upsertSubscriptionFromCheckoutSession(session: any, env: StripeEnv) {
  const subId = subscriptionIdFromCheckoutSession(session);
  if (!subId) return;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subId, {
    expand: ['items.data.price'],
  });
  if (!subscription.metadata?.userId && session.metadata?.userId) {
    (subscription as any).metadata = {
      ...(subscription.metadata ?? {}),
      ...session.metadata,
    };
  }
  await upsertSubscription(subscription, env);
}

async function updateSubscriptionStatus(invoice: any, status: string, env: StripeEnv) {
  const subId = subscriptionIdFromInvoice(invoice);
  if (subId) {
    const { error } = await getSupabase()
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subId)
      .eq('environment', env);
    if (error) throw error;
    return;
  }

  const customerId = stripeId(invoice?.customer);
  if (!customerId) return;
  const { error } = await getSupabase()
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
    .eq('environment', env);
  if (error) throw error;
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  // Idempotency: try to record this event id first. Duplicate delivery from
  // Stripe hits the unique (stripe_event_id, environment) constraint and we skip.
  const supabase = getSupabase();
  const { error: insertErr } = await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    environment: env,
  });
  if (insertErr) {
    // 23505 = unique_violation → already processed, safe to skip.
    if (isUniqueViolation(insertErr)) {
      console.log('Skipping duplicate webhook', event.id, event.type);
      return;
    }
    throw insertErr;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await upsertSubscription(event.data.object, env);
        break;
      case 'customer.subscription.deleted':
        await markCanceled(event.data.object, env);
        break;
      case 'checkout.session.completed':
        await logCouponRedemption(event.data.object);
        await upsertSubscriptionFromCheckoutSession(event.data.object, env);
        break;
      case 'invoice.paid':
        await updateSubscriptionStatus(event.data.object, 'active', env);
        break;
      case 'invoice.payment_failed':
        await updateSubscriptionStatus(event.data.object, 'past_due', env);
        break;
      default:
        console.log('Unhandled event:', event.type);
    }
  } catch (error) {
    // Drop the idempotency row so Stripe's retry can actually process the event.
    await supabase
      .from('webhook_events')
      .delete()
      .eq('stripe_event_id', event.id)
      .eq('environment', env);
    throw error;
  }
}


export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook rejected: missing or invalid env query param');
          return new Response('Webhook env query param must be sandbox or live', { status: 400 });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
