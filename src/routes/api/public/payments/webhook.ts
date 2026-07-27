import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function planFromPrice(price: any): string | null {
  const lookup = price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null;
  if (!lookup) return null;
  // Order matters — check most-specific keys first.
  if (lookup.startsWith('team_aimax')) return 'Team + AI Max';
  if (lookup.startsWith('team_v2') || lookup.startsWith('team_')) return 'Team';
  if (lookup.startsWith('pro_aimax')) return 'Professional + AI Max';
  if (lookup.startsWith('pro_v2') || lookup.startsWith('pro_') || lookup.startsWith('professional')) return 'Professional';
  if (lookup.startsWith('beginner')) return 'Beginner';
  if (lookup.startsWith('free')) return 'Free';
  return lookup;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) { console.error('No userId in subscription metadata'); return; }
  const item = subscription.items?.data?.[0];
  const priceLookup = item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.id;
  const productId = typeof item?.price?.product === 'string' ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    plan: planFromPrice(item?.price) ?? 'Unknown',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId ?? null,
    price_id: priceLookup ?? null,
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    environment: env,
    coupon_code: subscription.metadata?.boliviq_coupon ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
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

  await supabase.from('coupon_redemptions').insert({
    coupon_id: (coupon as any).id,
    coupon_code: couponCode,
    user_id: userId,
    plan: session.metadata?.plan ?? null,
    order_amount: orderAmount,
    discount_amount: discount,
  });
  await supabase
    .from('coupons')
    .update({ current_uses: (((coupon as any).current_uses ?? 0) as number) + 1 })
    .eq('id', (coupon as any).id);
}

async function updateSubscriptionStatusByCustomer(customerId: string, status: string, env: StripeEnv) {
  if (!customerId) return;
  await getSupabase()
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
    .eq('environment', env);
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
    if ((insertErr as any).code === '23505') {
      console.log('Skipping duplicate webhook', event.id, event.type);
      return;
    }
    throw insertErr;
  }

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
      break;
    case 'invoice.paid': {
      const inv = event.data.object;
      if (inv?.customer) await updateSubscriptionStatusByCustomer(inv.customer, 'active', env);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      if (inv?.customer) await updateSubscriptionStatusByCustomer(inv.customer, 'past_due', env);
      break;
    }
    default:
      console.log('Unhandled event:', event.type);
  }
}


export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          return Response.json({ received: true, ignored: 'invalid env' });
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
