import { afterEach, describe, expect, test } from "vitest";
import {
  getDirectStripeSecretKey,
  getLegacyConnectionApiKey,
  isStripeApiConfigured,
  isStripeWebhookConfigured,
} from "../src/lib/stripe.server";
import {
  planFromCheckoutMetadata,
  planFromPriceLookup,
  stripeId,
  subscriptionIdFromInvoice,
  subscriptionRowFromCheckoutSession,
} from "../src/lib/stripe-webhook";

const KEYS = [
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_SANDBOX_API_KEY",
  "STRIPE_LIVE_API_KEY",
  "LOVABLE_API_KEY",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "STRIPE_WEBHOOK_SECRET_LIVE",
  "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
  "PAYMENTS_LIVE_WEBHOOK_SECRET",
] as const;

const originalEnv = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function clearStripeEnv() {
  for (const key of KEYS) delete process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("Stripe secret key aliases", () => {
  test("uses STRIPE_SECRET_KEY_TEST when set", () => {
    clearStripeEnv();
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_preferred";
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_legacy";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_preferred");
    expect(isStripeApiConfigured("sandbox")).toBe(true);
  });

  test("treats sk_ values in STRIPE_SANDBOX_API_KEY as a direct Stripe secret", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_from_example";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_from_example");
    expect(getLegacyConnectionApiKey("sandbox")).toBeUndefined();
    expect(isStripeApiConfigured("sandbox")).toBe(true);
  });

  test("does not treat a Lovable connection token as a direct Stripe secret", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "conn_not_a_stripe_secret";
    expect(getDirectStripeSecretKey("sandbox")).toBeUndefined();
    expect(getLegacyConnectionApiKey("sandbox")).toBe("conn_not_a_stripe_secret");
    expect(isStripeApiConfigured("sandbox")).toBe(false);
  });

  test("accepts either webhook secret name", () => {
    clearStripeEnv();
    expect(isStripeWebhookConfigured("sandbox")).toBe(false);
    process.env.STRIPE_WEBHOOK_SECRET_TEST = "whsec_new";
    expect(isStripeWebhookConfigured("sandbox")).toBe(true);
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = "whsec_legacy";
    expect(isStripeWebhookConfigured("sandbox")).toBe(true);
  });
});

describe("Webhook subscription mapping", () => {
  test("maps Boliviq lookup keys to plan names", () => {
    expect(planFromPriceLookup("pro_v2_monthly")).toBe("Professional");
    expect(planFromPriceLookup("pro_aimax_yearly")).toBe("Professional + AI Max");
    expect(planFromPriceLookup("team_aimax_monthly")).toBe("Team + AI Max");
    expect(planFromPriceLookup("beginner_yearly")).toBe("Beginner");
  });

  test("reads planName from checkout session metadata", () => {
    expect(planFromCheckoutMetadata({ planName: "Professional", planTier: "professional" })).toBe("Professional");
    expect(planFromCheckoutMetadata({ plan: "Beginner" })).toBe("Beginner");
  });

  test("reads invoice subscription ids from current and 2026 parent shapes", () => {
    expect(subscriptionIdFromInvoice({ subscription: "sub_legacy" })).toBe("sub_legacy");
    expect(subscriptionIdFromInvoice({ parent: { subscription_details: { subscription: "sub_dahlia" } } })).toBe("sub_dahlia");
    expect(stripeId({ id: "cus_123" })).toBe("cus_123");
  });

  test("builds a subscription row from checkout.session.completed", () => {
    const row = subscriptionRowFromCheckoutSession({
      metadata: { userId: "user-1", planName: "Professional", priceLookupKey: "pro_v2_monthly" },
      customer: "cus_abc",
      subscription: "sub_abc",
      payment_status: "paid",
    }, "sandbox");
    expect(row).toMatchObject({
      user_id: "user-1",
      plan: "Professional",
      stripe_subscription_id: "sub_abc",
      stripe_customer_id: "cus_abc",
      price_id: "pro_v2_monthly",
      status: "active",
      environment: "sandbox",
    });
  });
});
