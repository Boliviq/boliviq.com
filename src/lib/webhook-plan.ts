import { getBillingOptionByLookupKey } from "@/lib/checkout-config";

export function planFromLookupKey(lookup: string | null | undefined): string | null {
  if (!lookup) return null;
  try {
    return getBillingOptionByLookupKey(lookup).planName;
  } catch {
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
}

export function planFromPrice(price: {
  lookup_key?: string | null;
  id?: string | null;
  metadata?: { lovable_external_id?: string | null } | null;
} | null | undefined): string | null {
  return planFromLookupKey(price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null);
}

export function couponPlanFromSessionMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): string | null {
  return metadata?.planName ?? metadata?.plan ?? null;
}

export function invoiceSubscriptionId(invoice: {
  subscription?: unknown;
  parent?: { subscription_details?: { subscription?: unknown } };
} | null | undefined): string | null {
  const direct = invoice?.subscription;
  if (typeof direct === "string" && direct) return direct;
  if (direct && typeof direct === "object" && "id" in direct && typeof (direct as { id: unknown }).id === "string") {
    return (direct as { id: string }).id;
  }
  const nested = invoice?.parent?.subscription_details?.subscription;
  if (typeof nested === "string" && nested) return nested;
  if (nested && typeof nested === "object" && "id" in nested && typeof (nested as { id: unknown }).id === "string") {
    return (nested as { id: string }).id;
  }
  return null;
}
