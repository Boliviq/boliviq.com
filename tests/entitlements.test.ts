import { describe, expect, test } from "vitest";
import {
  choosePaidSubscription,
  entitlementFromSubscription,
  limitsForTier,
  planTierFromName,
  propertyQuotaError,
} from "../src/lib/entitlements";

describe("plan entitlements", () => {
  test("maps plan names to tiers", () => {
    expect(planTierFromName("Free")).toBe("free");
    expect(planTierFromName("Beginner")).toBe("beginner");
    expect(planTierFromName("Professional")).toBe("professional");
    expect(planTierFromName("Professional + AI Max")).toBe("professional_ai_max");
    expect(planTierFromName("Team")).toBe("team");
    expect(planTierFromName("Team + AI Max")).toBe("team_ai_max");
  });

  test("Professional unlocks standard AI; AI Max unlocks gpt-4o class", () => {
    expect(limitsForTier("beginner").ai).toBe("none");
    expect(limitsForTier("professional").ai).toBe("standard");
    expect(limitsForTier("professional_ai_max").ai).toBe("max");
  });

  test("prefers a paid subscription over a newer free row", () => {
    const chosen = choosePaidSubscription([
      { plan: "Free", status: "canceled", current_period_end: "2020-01-01T00:00:00.000Z" },
      { plan: "Professional", status: "active" },
    ]);
    expect(chosen?.plan).toBe("Professional");
  });

  test("admins get AI Max even without a subscription", () => {
    const ent = entitlementFromSubscription({ subscription: null, isAdmin: true, creditsUsed: 0 });
    expect(ent.ai).toBe("max");
    expect(ent.paid).toBe(true);
  });

  test("property quota blocks over-limit inserts", () => {
    const ent = entitlementFromSubscription({ subscription: null, isAdmin: false, creditsUsed: 0 });
    expect(propertyQuotaError(10, 1, ent)).toMatch(/allows 10 properties/);
    expect(propertyQuotaError(9, 1, ent)).toBeNull();
  });
});
