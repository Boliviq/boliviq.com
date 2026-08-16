import Stripe from "stripe";

const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value || undefined;
};

const getEnv = (key: string): string => {
  const value = optionalEnv(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

export const STRIPE_SDK_VERSION = "22.0.2";
export const STRIPE_API_VERSION = "2026-03-25.dahlia";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

function looksLikeStripeSecretKey(value: string | undefined): boolean {
  return !!value && (value.startsWith("sk_test_") || value.startsWith("sk_live_") || value.startsWith("rk_test_") || value.startsWith("rk_live_"));
}

function preferredSecretKeyVar(env: StripeEnv): string {
  return env === "sandbox" ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY_LIVE";
}

function legacyApiKeyVar(env: StripeEnv): string {
  return env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY";
}

/**
 * Prefer independent Stripe secret keys (STRIPE_SECRET_KEY_TEST/LIVE).
 * Also accept sk_/rk_ values in the legacy Lovable variable names so
 * `.env.example` and older deployments keep working without a Lovable gateway.
 */
export function getDirectStripeSecretKey(env: StripeEnv): string | undefined {
  const preferred = optionalEnv(preferredSecretKeyVar(env));
  if (looksLikeStripeSecretKey(preferred)) return preferred;
  const legacy = optionalEnv(legacyApiKeyVar(env));
  if (looksLikeStripeSecretKey(legacy)) return legacy;
  return undefined;
}

export function getLegacyConnectionApiKey(env: StripeEnv): string | undefined {
  const legacy = optionalEnv(legacyApiKeyVar(env));
  if (!legacy || looksLikeStripeSecretKey(legacy)) return undefined;
  return legacy;
}

export function isStripeApiConfigured(env: StripeEnv): boolean {
  return !!getDirectStripeSecretKey(env) || (!!getLegacyConnectionApiKey(env) && !!optionalEnv("LOVABLE_API_KEY"));
}

export function stripeApiKeyEnvLabel(env: StripeEnv): string {
  if (optionalEnv(preferredSecretKeyVar(env))) return preferredSecretKeyVar(env);
  return legacyApiKeyVar(env);
}

export function stripeWebhookSecretEnvLabel(env: StripeEnv): string {
  if (env === "sandbox") {
    return optionalEnv("STRIPE_WEBHOOK_SECRET_TEST") ? "STRIPE_WEBHOOK_SECRET_TEST" : "PAYMENTS_SANDBOX_WEBHOOK_SECRET";
  }
  return optionalEnv("STRIPE_WEBHOOK_SECRET_LIVE") ? "STRIPE_WEBHOOK_SECRET_LIVE" : "PAYMENTS_LIVE_WEBHOOK_SECRET";
}

export function createStripeClient(env: StripeEnv): Stripe {
  const directSecretKey = getDirectStripeSecretKey(env);
  if (directSecretKey) {
    return new Stripe(directSecretKey, {
      apiVersion: STRIPE_API_VERSION as any,
    });
  }

  const connectionApiKey = getLegacyConnectionApiKey(env);
  const lovableApiKey = optionalEnv("LOVABLE_API_KEY");
  if (!connectionApiKey || !lovableApiKey) {
    throw new Error(
      env === "sandbox"
        ? "STRIPE_SECRET_KEY_TEST is not configured"
        : "STRIPE_SECRET_KEY_LIVE is not configured",
    );
  }

  return new Stripe(connectionApiKey, {
    apiVersion: STRIPE_API_VERSION as any,
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
          ),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };
    const message = e.raw?.message ?? e.message;
    if (message) {
      const details = [
        e.raw?.type ?? e.type,
        e.raw?.code ?? e.code,
        e.raw?.decline_code ?? e.decline_code,
        e.raw?.param ?? e.param,
        e.raw?.requestId ?? e.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }
  return "Stripe request failed";
}

export function getWebhookSecret(env: StripeEnv): string {
  if (env === "sandbox") {
    return optionalEnv("STRIPE_WEBHOOK_SECRET_TEST") ?? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET");
  }
  return optionalEnv("STRIPE_WEBHOOK_SECRET_LIVE") ?? getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export function isStripeWebhookConfigured(env: StripeEnv): boolean {
  return env === "sandbox"
    ? !!optionalEnv("STRIPE_WEBHOOK_SECRET_TEST") || !!optionalEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : !!optionalEnv("STRIPE_WEBHOOK_SECRET_LIVE") || !!optionalEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ id: string; type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.some((signature) => timingSafeEqual(signature, expected))) {
    throw new Error("Invalid webhook signature");
  }

  const parsed = JSON.parse(body);
  if (!parsed?.id || typeof parsed.id !== "string") throw new Error("Webhook payload missing event id");
  return parsed;
}
