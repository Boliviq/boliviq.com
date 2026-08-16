import { describe, expect, test } from "vitest";
import {
  couponPlanFromSessionMetadata,
  invoiceSubscriptionId,
  planFromLookupKey,
  planFromPrice,
} from "../src/lib/webhook-plan";

describe("Webhook plan mapping", () => {
  test("resolves catalog lookup keys to plan names", () => {
    expect(planFromLookupKey("beginner_monthly")).toBe("Beginner");
    expect(planFromLookupKey("pro_v2_yearly")).toBe("Professional");
    expect(planFromLookupKey("pro_aimax_monthly")).toBe("Professional + AI Max");
    expect(planFromLookupKey("team_v2_monthly")).toBe("Team");
    expect(planFromLookupKey("team_aimax_yearly")).toBe("Team + AI Max");
  });

  test("falls back to prefix matching for unknown keys", () => {
    expect(planFromLookupKey("pro_v2_custom")).toBe("Professional");
    expect(planFromPrice({ lookup_key: null, metadata: { lovable_external_id: "beginner_promo" } })).toBe("Beginner");
  });

  test("coupon logging reads planName written by checkout metadata", () => {
    expect(couponPlanFromSessionMetadata({ planName: "Professional", planTier: "professional" })).toBe("Professional");
    expect(couponPlanFromSessionMetadata({ plan: "Beginner" })).toBe("Beginner");
    expect(couponPlanFromSessionMetadata({})).toBeNull();
  });

  test("invoice subscription id supports current and legacy Stripe shapes", () => {
    expect(invoiceSubscriptionId({ subscription: "sub_123" })).toBe("sub_123");
    expect(invoiceSubscriptionId({ subscription: { id: "sub_obj" } })).toBe("sub_obj");
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_nested" } } })).toBe("sub_nested");
  });
});
