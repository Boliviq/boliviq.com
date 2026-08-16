import { afterEach, describe, expect, test } from "vitest";
import {
  couponPlanFromCheckoutSession,
  planFromPrice,
  planFromPriceLookup,
  stripeId,
  subscriptionIdFromInvoice,
} from "../src/lib/billing-mapping";
import {
  describeStripeApiConfiguration,
  getDirectStripeSecretKey,
  getLegacyConnectionApiKey,
  isStripeApiConfigured,
  isStripeWebhookConfigured,
} from "../src/lib/stripe-env";

describe("plan lookup mapping", () => {
  test("matches most-specific lookup keys first", () => {
    expect(planFromPriceLookup("team_aimax_monthly")).toBe("Team + AI Max");
    expect(planFromPriceLookup("team_v2_yearly")).toBe("Team");
    expect(planFromPriceLookup("pro_aimax_monthly")).toBe("Professional + AI Max");
    expect(planFromPriceLookup("pro_v2_yearly")).toBe("Professional");
    expect(planFromPriceLookup("beginner_monthly")).toBe("Beginner");
  });

  test("reads Stripe price lookup_key and Lovable metadata fallback", () => {
    expect(planFromPrice({ lookup_key: "beginner_yearly" })).toBe("Beginner");
    expect(planFromPrice({ metadata: { lovable_external_id: "pro_v2_monthly" } })).toBe("Professional");
  });
});

describe("checkout session coupon metadata", () => {
  test("uses planName written by checkout, with plan as a fallback", () => {
    expect(couponPlanFromCheckoutSession({ metadata: { planName: "Professional" } })).toBe("Professional");
    expect(couponPlanFromCheckoutSession({ metadata: { plan: "Beginner" } })).toBe("Beginner");
    expect(couponPlanFromCheckoutSession({ metadata: { planName: "Team", plan: "ignored" } })).toBe("Team");
  });
});

describe("Stripe object id coercion", () => {
  test("accepts string ids and expanded objects", () => {
    expect(stripeId("cus_123")).toBe("cus_123");
    expect(stripeId({ id: "sub_123" })).toBe("sub_123");
    expect(stripeId(null)).toBeNull();
  });

  test("reads Basil invoice.parent.subscription_details before legacy subscription", () => {
    expect(
      subscriptionIdFromInvoice({
        parent: { type: "subscription_details", subscription_details: { subscription: "sub_parent" } },
        subscription: "sub_legacy",
      }),
    ).toBe("sub_parent");
    expect(subscriptionIdFromInvoice({ subscription: "sub_legacy" })).toBe("sub_legacy");
    expect(subscriptionIdFromInvoice({ parent: { type: "quote_details" }, subscription: undefined })).toBeNull();
  });
});

const STRIPE_ENV_KEYS = [
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_SANDBOX_API_KEY",
  "STRIPE_LIVE_API_KEY",
  "LOVABLE_API_KEY",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
] as const;

describe("Stripe env resolution", () => {
  afterEach(() => {
    for (const key of STRIPE_ENV_KEYS) delete process.env[key];
  });

  test("treats sk_test values in the legacy Lovable var as direct Stripe keys", () => {
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_abc";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_abc");
    expect(getLegacyConnectionApiKey("sandbox")).toBeUndefined();
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(describeStripeApiConfiguration("sandbox").configured).toBe(true);
  });

  test("prefers STRIPE_SECRET_KEY_TEST over the legacy alias", () => {
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_direct";
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_legacy";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_direct");
  });

  test("keeps opaque Lovable connection keys on the gateway path", () => {
    process.env.STRIPE_SANDBOX_API_KEY = "lovable-connection-token";
    expect(getDirectStripeSecretKey("sandbox")).toBeUndefined();
    expect(getLegacyConnectionApiKey("sandbox")).toBe("lovable-connection-token");
    expect(isStripeApiConfigured("sandbox")).toBe(false);
    process.env.LOVABLE_API_KEY = "lovable-api";
    expect(isStripeApiConfigured("sandbox")).toBe(true);
  });

  test("accepts either webhook secret name", () => {
    expect(isStripeWebhookConfigured("sandbox")).toBe(false);
    process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = "whsec_legacy";
    expect(isStripeWebhookConfigured("sandbox")).toBe(true);
    delete process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET_TEST = "whsec_direct";
    expect(isStripeWebhookConfigured("sandbox")).toBe(true);
  });
});
