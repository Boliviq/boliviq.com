/**
 * Map Stripe webhook payloads onto Boliviq plan names.
 *
 * Checkout writes `planName` / `planTier` / `priceLookupKey` onto both the
 * session and the subscription. Prefer that metadata; fall back to the
 * Stripe price lookup key (and the older Lovable external-id field).
 */
export function planFromLookupKey(lookup: string | null | undefined): string | null {
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

export function planFromPrice(price: { lookup_key?: string | null; metadata?: Record<string, string> | null } | null | undefined): string | null {
  return planFromLookupKey(price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null);
}

export function planFromSubscription(subscription: {
  metadata?: Record<string, string> | null;
  items?: { data?: Array<{ price?: { lookup_key?: string | null; id?: string; metadata?: Record<string, string> | null } }> };
}): string {
  return (
    subscription.metadata?.planName ??
    planFromPrice(subscription.items?.data?.[0]?.price) ??
    "Unknown"
  );
}

export function couponPlanFromSession(session: { metadata?: Record<string, string> | null }): string | null {
  return session.metadata?.planName ?? session.metadata?.plan ?? null;
}

export function priceLookupFromItem(item: {
  price?: { lookup_key?: string | null; id?: string; metadata?: Record<string, string> | null };
} | null | undefined): string | null {
  return (
    item?.price?.lookup_key ??
    item?.price?.metadata?.lovable_external_id ??
    item?.price?.id ??
    null
  );
}
