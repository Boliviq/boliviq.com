import { afterEach, describe, expect, test } from "vitest";
import {
  getDirectStripeSecretKey,
  isStripeApiConfigured,
  isStripeWebhookConfigured,
  stripeApiKeyCheck,
  stripeWebhookSecretCheck,
} from "../src/lib/stripe.server";

const KEYS = [
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_SANDBOX_API_KEY",
  "STRIPE_LIVE_API_KEY",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "STRIPE_WEBHOOK_SECRET_LIVE",
  "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
  "PAYMENTS_LIVE_WEBHOOK_SECRET",
  "LOVABLE_API_KEY",
] as const;

const original: Record<string, string | undefined> = {};
for (const key of KEYS) original[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function clearStripeEnv() {
  for (const key of KEYS) delete process.env[key];
}

describe("Stripe environment aliases", () => {
  test("independent deploy: STRIPE_SANDBOX_API_KEY is used as a real secret when LOVABLE_API_KEY is absent", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_example";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_example");
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(stripeApiKeyCheck("sandbox")).toEqual({
      configured: true,
      variable: "STRIPE_SANDBOX_API_KEY",
    });
  });

  test("dedicated STRIPE_SECRET_KEY_TEST wins over the legacy alias", () => {
    clearStripeEnv();
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_direct";
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_legacy";
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_direct");
    expect(stripeApiKeyCheck("sandbox").variable).toBe("STRIPE_SECRET_KEY_TEST");
  });

  test("Lovable gateway keys are not treated as direct secrets", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "connection_key";
    process.env.LOVABLE_API_KEY = "lovable_key";
    expect(getDirectStripeSecretKey("sandbox")).toBeUndefined();
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(stripeApiKeyCheck("sandbox").variable).toBe("STRIPE_SANDBOX_API_KEY + LOVABLE_API_KEY");
  });

  test("webhook secret accepts both dedicated and legacy names", () => {
    clearStripeEnv();
    expect(isStripeWebhookConfigured("live")).toBe(false);
    process.env.PAYMENTS_LIVE_WEBHOOK_SECRET = "whsec_legacy";
    expect(isStripeWebhookConfigured("live")).toBe(true);
    expect(stripeWebhookSecretCheck("live").variable).toBe("PAYMENTS_LIVE_WEBHOOK_SECRET");
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = "whsec_direct";
    expect(stripeWebhookSecretCheck("live").variable).toBe("STRIPE_WEBHOOK_SECRET_LIVE");
  });
});
