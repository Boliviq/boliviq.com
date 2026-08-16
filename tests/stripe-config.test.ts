import { afterEach, describe, expect, test } from "vitest";
import {
  describeStripeApiKeyConfig,
  describeStripeWebhookConfig,
  getDirectStripeSecretKey,
  isDirectStripeSecret,
  isStripeApiConfigured,
  isStripeWebhookConfigured,
  parseStripeEnvParam,
} from "../src/lib/stripe.server";

const STRIPE_ENV_KEYS = [
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

const original = Object.fromEntries(STRIPE_ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of STRIPE_ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function clearStripeEnv() {
  for (const key of STRIPE_ENV_KEYS) delete process.env[key];
}

describe("Stripe environment resolution", () => {
  test("parseStripeEnvParam only accepts sandbox or live", () => {
    expect(parseStripeEnvParam("sandbox")).toBe("sandbox");
    expect(parseStripeEnvParam("live")).toBe("live");
    expect(parseStripeEnvParam("test")).toBeNull();
    expect(parseStripeEnvParam(null)).toBeNull();
  });

  test("treats sk_/rk_ values as direct Stripe secrets", () => {
    expect(isDirectStripeSecret("sk_test_abc")).toBe(true);
    expect(isDirectStripeSecret("sk_live_abc")).toBe(true);
    expect(isDirectStripeSecret("rk_test_abc")).toBe(true);
    expect(isDirectStripeSecret("conn_lovable_token")).toBe(false);
  });

  test("preferred STRIPE_SECRET_KEY_* vars configure the API", () => {
    clearStripeEnv();
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_preferred";
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_preferred");
    expect(describeStripeApiKeyConfig("sandbox").configured).toBe(true);
  });

  test("legacy STRIPE_SANDBOX_API_KEY works as a direct key without LOVABLE_API_KEY", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "sk_test_legacy_direct";
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(getDirectStripeSecretKey("sandbox")).toBe("sk_test_legacy_direct");
    expect(describeStripeApiKeyConfig("sandbox").detail).toMatch(/direct Stripe secret key/);
  });

  test("legacy connector token still requires LOVABLE_API_KEY", () => {
    clearStripeEnv();
    process.env.STRIPE_SANDBOX_API_KEY = "lovable_connection_token";
    expect(isStripeApiConfigured("sandbox")).toBe(false);
    expect(describeStripeApiKeyConfig("sandbox").configured).toBe(false);

    process.env.LOVABLE_API_KEY = "lv_api_key";
    expect(isStripeApiConfigured("sandbox")).toBe(true);
    expect(getDirectStripeSecretKey("sandbox")).toBeUndefined();
  });

  test("webhook secrets accept preferred and legacy names", () => {
    clearStripeEnv();
    expect(isStripeWebhookConfigured("live")).toBe(false);
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = "whsec_preferred";
    expect(isStripeWebhookConfigured("live")).toBe(true);
    expect(describeStripeWebhookConfig("live").detail).toMatch(/STRIPE_WEBHOOK_SECRET_LIVE/);

    clearStripeEnv();
    process.env.PAYMENTS_LIVE_WEBHOOK_SECRET = "whsec_legacy";
    expect(isStripeWebhookConfigured("live")).toBe(true);
    expect(describeStripeWebhookConfig("live").detail).toMatch(/PAYMENTS_LIVE_WEBHOOK_SECRET/);
  });
});
