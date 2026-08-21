/**
 * Shared Stripe ↔ Boliviq mapping helpers used by checkout and webhooks.
 * Keep this module free of server-only imports so unit tests can run it in Node.
 */

export function planFromPriceLookup(lookup: string | null | undefined): string | null {
  if (!lookup) return null;
  // Order matters — check most-specific keys first.
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

export function planFromPrice(price: {
  lookup_key?: string | null;
  metadata?: { lovable_external_id?: string | null } | null;
} | null | undefined): string | null {
  const lookup = price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null;
  return planFromPriceLookup(lookup);
}

export function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

/**
 * Resolve a Subscription id from an Invoice payload across Stripe API versions.
 * Basil (2025-03-31) removed top-level `invoice.subscription` and moved it to
 * `invoice.parent.subscription_details.subscription`.
 */
export function subscriptionIdFromInvoice(invoice: {
  subscription?: unknown;
  parent?: {
    type?: string | null;
    subscription_details?: { subscription?: unknown } | null;
  } | null;
} | null | undefined): string | null {
  if (!invoice) return null;
  const parent = invoice.parent;
  if (parent?.type === "subscription_details") {
    const fromParent = stripeId(parent.subscription_details?.subscription);
    if (fromParent) return fromParent;
  }
  return stripeId(invoice.subscription);
}

export function couponPlanFromCheckoutSession(session: {
  metadata?: Record<string, string | undefined> | null;
} | null | undefined): string | null {
  const meta = session?.metadata ?? {};
  return meta.planName ?? meta.plan ?? null;
}

export function subscriptionIdFromCheckoutSession(session: {
  subscription?: unknown;
  invoice?: unknown;
} | null | undefined): string | null {
  const fromSession = stripeId(session?.subscription);
  if (fromSession) return fromSession;
  if (session?.invoice && typeof session.invoice === "object") {
    return subscriptionIdFromInvoice(session.invoice as Parameters<typeof subscriptionIdFromInvoice>[0]);
  }
  return null;
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
