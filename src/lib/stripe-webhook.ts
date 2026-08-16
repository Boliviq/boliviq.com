/**
 * Pure helpers for Stripe webhook → Boliviq subscription mapping.
 * Kept out of the route file so they can be unit-tested.
 */

export function planFromPriceLookup(lookup: string | null | undefined): string | null {
  if (!lookup) return null;
  if (lookup.startsWith("team_aimax")) return "Team + AI Max";
  if (lookup.startsWith("team_v2") || lookup.startsWith("team_")) return "Team";
  if (lookup.startsWith("pro_aimax")) return "Professional + AI Max";
  if (lookup.startsWith("pro_v2") || lookup.startsWith("pro_") || lookup.startsWith("professional")) {
    return "Professional";
  }
  if (lookup.startsWith("beginner")) return "Beginner";
  if (lookup.startsWith("free")) return "Free";
  return lookup;
}

export function planFromPrice(price: { lookup_key?: string | null; metadata?: { lovable_external_id?: string } } | null | undefined): string | null {
  return planFromPriceLookup(price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null);
}

/** Checkout session metadata uses planName; older payloads may still send plan. */
export function planFromCheckoutMetadata(metadata: Record<string, string> | null | undefined): string | null {
  return metadata?.planName || metadata?.plan || null;
}

export function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

/** Stripe Billing API 2026 moved invoice.subscription under parent.subscription_details. */
export function subscriptionIdFromInvoice(invoice: {
  subscription?: unknown;
  parent?: { subscription_details?: { subscription?: unknown } };
}): string | null {
  return stripeId(invoice.subscription) ?? stripeId(invoice.parent?.subscription_details?.subscription);
}

export function subscriptionRowFromCheckoutSession(
  session: {
    metadata?: Record<string, string> | null;
    customer?: unknown;
    subscription?: unknown;
    payment_status?: string | null;
    status?: string | null;
  },
  env: "sandbox" | "live",
) {
  const userId = session.metadata?.userId;
  const subscriptionId = stripeId(session.subscription);
  if (!userId || !subscriptionId) return null;
  return {
    user_id: userId,
    plan: planFromCheckoutMetadata(session.metadata) ?? "Unknown",
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: stripeId(session.customer),
    price_id: session.metadata?.priceLookupKey ?? null,
    status: session.payment_status === "paid" ? "active" : (session.status ?? "incomplete"),
    environment: env,
    coupon_code: session.metadata?.boliviq_coupon ?? null,
    updated_at: new Date().toISOString(),
  };
}
