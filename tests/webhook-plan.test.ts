import { describe, expect, test } from "vitest";
import {
  couponPlanFromSession,
  planFromLookupKey,
  planFromSubscription,
  priceLookupFromItem,
} from "../src/lib/webhook-plan";

describe("webhook plan mapping", () => {
  test("prefers checkout metadata planName over price lookup", () => {
    expect(
      planFromSubscription({
        metadata: { planName: "Professional + AI Max", userId: "u1" },
        items: { data: [{ price: { lookup_key: "pro_v2_monthly" } }] },
      }),
    ).toBe("Professional + AI Max");
  });

  test("falls back to lookup-key prefixes", () => {
    expect(planFromLookupKey("beginner_yearly")).toBe("Beginner");
    expect(planFromLookupKey("pro_v2_monthly")).toBe("Professional");
    expect(planFromLookupKey("pro_aimax_yearly")).toBe("Professional + AI Max");
    expect(planFromLookupKey("team_v2_monthly")).toBe("Team");
    expect(planFromLookupKey("team_aimax_yearly")).toBe("Team + AI Max");
  });

  test("coupon redemption reads planName, not the unset plan field", () => {
    expect(couponPlanFromSession({ metadata: { planName: "Beginner", planTier: "beginner" } })).toBe("Beginner");
    expect(couponPlanFromSession({ metadata: { plan: "legacy" } })).toBe("legacy");
  });

  test("price lookup prefers lookup_key then lovable metadata then price id", () => {
    expect(priceLookupFromItem({ price: { lookup_key: "beginner_monthly", id: "price_123" } })).toBe("beginner_monthly");
    expect(priceLookupFromItem({ price: { id: "price_123", metadata: { lovable_external_id: "beginner_monthly" } } })).toBe("beginner_monthly");
    expect(priceLookupFromItem({ price: { id: "price_123" } })).toBe("price_123");
  });
});
