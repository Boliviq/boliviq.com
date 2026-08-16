export type StripeEnv = "sandbox" | "live";

export const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value || undefined;
};

export function isDirectStripeSecret(value: string | undefined): value is string {
  return !!value && /^(sk|rk)_(test|live)_/.test(value);
}

export function getDirectStripeSecretKey(env: StripeEnv): string | undefined {
  const preferred = env === "sandbox"
    ? optionalEnv("STRIPE_SECRET_KEY_TEST")
    : optionalEnv("STRIPE_SECRET_KEY_LIVE");
  if (isDirectStripeSecret(preferred)) return preferred;

  const aliased = env === "sandbox"
    ? optionalEnv("STRIPE_SANDBOX_API_KEY")
    : optionalEnv("STRIPE_LIVE_API_KEY");
  if (isDirectStripeSecret(aliased)) return aliased;
  return undefined;
}

export function getLegacyConnectionApiKey(env: StripeEnv): string | undefined {
  const value = env === "sandbox"
    ? optionalEnv("STRIPE_SANDBOX_API_KEY")
    : optionalEnv("STRIPE_LIVE_API_KEY");
  if (!value || isDirectStripeSecret(value)) return undefined;
  return value;
}

export function isStripeApiConfigured(env: StripeEnv): boolean {
  return !!getDirectStripeSecretKey(env) || (!!getLegacyConnectionApiKey(env) && !!optionalEnv("LOVABLE_API_KEY"));
}

export function describeStripeApiConfiguration(env: StripeEnv): { configured: boolean; detail: string } {
  if (getDirectStripeSecretKey(env)) {
    return { configured: true, detail: "Direct Stripe secret key is configured." };
  }
  if (getLegacyConnectionApiKey(env) && optionalEnv("LOVABLE_API_KEY")) {
    return { configured: true, detail: "Lovable Stripe connector is configured." };
  }
  const secretVar = env === "sandbox" ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY_LIVE";
  const aliasVar = env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY";
  return {
    configured: false,
    detail: `Missing ${secretVar} (or a Stripe sk_/rk_ value in ${aliasVar}).`,
  };
}

export function isStripeWebhookConfigured(env: StripeEnv): boolean {
  return env === "sandbox"
    ? !!optionalEnv("STRIPE_WEBHOOK_SECRET_TEST") || !!optionalEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : !!optionalEnv("STRIPE_WEBHOOK_SECRET_LIVE") || !!optionalEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export function describeStripeWebhookConfiguration(env: StripeEnv): { configured: boolean; detail: string } {
  const configured = isStripeWebhookConfigured(env);
  const primary = env === "sandbox" ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE";
  const alias = env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET";
  return {
    configured,
    detail: configured
      ? "Webhook signing secret is configured."
      : `Missing ${primary} (or ${alias}).`,
  };
}

export function getWebhookSecret(env: StripeEnv): string {
  const getEnv = (key: string): string => {
    const value = optionalEnv(key);
    if (!value) throw new Error(`${key} is not configured`);
    return value;
  };
  if (env === "sandbox") {
    return optionalEnv("STRIPE_WEBHOOK_SECRET_TEST") ?? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET");
  }
  return optionalEnv("STRIPE_WEBHOOK_SECRET_LIVE") ?? getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}
