import { hasPaidAccess } from "@/lib/subscription-access";
import type { PlanTier } from "@/lib/plans";

export type AiLevel = "none" | "standard" | "max";

export type Entitlement = {
  planName: string;
  planTier: PlanTier;
  paid: boolean;
  isAdmin: boolean;
  maxProperties: number;
  ai: AiLevel;
  creditsIncluded: number;
  creditsUsed: number;
};

export function planTierFromName(plan: string | null | undefined): PlanTier {
  const p = (plan ?? "").toLowerCase();
  if (!p || p === "free") return "free";
  if (p.includes("team") && (p.includes("ai") || p.includes("aimax"))) return "team_ai_max";
  if ((p.includes("professional") || p.includes("pro")) && (p.includes("ai") || p.includes("aimax"))) {
    return "professional_ai_max";
  }
  if (p.includes("team")) return "team";
  if (p.includes("professional") || p.startsWith("pro")) return "professional";
  if (p.includes("beginner") || p.includes("starter")) return "beginner";
  return "free";
}

export function limitsForTier(tier: PlanTier): Pick<Entitlement, "maxProperties" | "ai" | "creditsIncluded"> {
  switch (tier) {
    case "beginner":
      return { maxProperties: 500, ai: "none", creditsIncluded: 500 };
    case "professional":
      return { maxProperties: 5000, ai: "standard", creditsIncluded: 2500 };
    case "professional_ai_max":
      return { maxProperties: 5000, ai: "max", creditsIncluded: 25000 };
    case "team":
      return { maxProperties: 25000, ai: "standard", creditsIncluded: 7500 };
    case "team_ai_max":
      return { maxProperties: 25000, ai: "max", creditsIncluded: 50000 };
    default:
      return { maxProperties: 10, ai: "none", creditsIncluded: 100 };
  }
}

export function entitlementFromSubscription(input: {
  subscription: { plan?: string | null; status?: string | null; stripe_customer_id?: string | null; current_period_end?: string | null } | null;
  isAdmin: boolean;
  creditsUsed: number;
}): Entitlement {
  const paid = input.isAdmin || hasPaidAccess(input.subscription);
  const planName = paid ? (input.subscription?.plan || (input.isAdmin ? "Admin" : "Free")) : "Free";
  const planTier = input.isAdmin && !input.subscription?.plan ? "professional_ai_max" : planTierFromName(planName);
  const limits = limitsForTier(input.isAdmin ? (planTier === "free" ? "professional_ai_max" : planTier) : planTier);
  return {
    planName,
    planTier: input.isAdmin && planTier === "free" ? "professional_ai_max" : planTier,
    paid,
    isAdmin: input.isAdmin,
    maxProperties: input.isAdmin ? 1_000_000 : limits.maxProperties,
    ai: input.isAdmin ? "max" : limits.ai,
    creditsIncluded: input.isAdmin ? 1_000_000 : limits.creditsIncluded,
    creditsUsed: input.creditsUsed,
  };
}

export function canUseAi(ent: Entitlement): boolean {
  return ent.ai !== "none" && ent.creditsUsed < ent.creditsIncluded;
}

export function choosePaidSubscription<T extends {
  plan?: string | null;
  status?: string | null;
  stripe_customer_id?: string | null;
  current_period_end?: string | null;
}>(rows: T[]): T | null {
  return rows.find((row) => entitlementFromSubscription({
    subscription: row,
    isAdmin: false,
    creditsUsed: 0,
  }).paid) ?? rows[0] ?? null;
}

export function propertyQuotaError(
  currentCount: number,
  adding: number,
  entitlement: Entitlement | null | undefined,
): string | null {
  if (!entitlement) return null;
  if (currentCount + adding > entitlement.maxProperties) {
    return `Your ${entitlement.planName} plan allows ${entitlement.maxProperties} properties. Upgrade in Billing.`;
  }
  return null;
}

export const OFFER_STATUSES = new Set([
  "offer_submitted",
  "negotiating",
  "under_contract",
]);
