import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const legacyClientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const configuredMode = import.meta.env.VITE_STRIPE_MODE as StripeEnv | undefined;
const testPublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST as string | undefined;
const livePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE as string | undefined;

function resolveClientConfiguration(): { environment: StripeEnv; publishableKey: string } {
  if (configuredMode === "sandbox" && testPublishableKey?.startsWith("pk_test_")) {
    return { environment: "sandbox", publishableKey: testPublishableKey };
  }
  if (configuredMode === "live" && livePublishableKey?.startsWith("pk_live_")) {
    return { environment: "live", publishableKey: livePublishableKey };
  }
  if (legacyClientToken?.startsWith("pk_test_")) {
    return { environment: "sandbox", publishableKey: legacyClientToken };
  }
  if (legacyClientToken?.startsWith("pk_live_")) {
    return { environment: "live", publishableKey: legacyClientToken };
  }
  throw new Error(
    "Payments are not configured for this build. Configure a Stripe publishable key for the selected environment.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(resolveClientConfiguration().publishableKey);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return resolveClientConfiguration().environment;
}

export function isPaymentsConfigured(): boolean {
  try {
    resolveClientConfiguration();
    return true;
  } catch {
    return false;
  }
}
