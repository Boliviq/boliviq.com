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

export function parseStripeEnvParam(raw: string | null | undefined): StripeEnv | null {
  return raw === "sandbox" || raw === "live" ? raw : null;
}

/** Real Stripe secret/restricted keys can talk to api.stripe.com directly. */
export function isDirectStripeSecret(value: string | undefined): boolean {
  return !!value && /^(sk_test_|sk_live_|rk_test_|rk_live_)/.test(value);
}

export function getLegacyConnectionApiKey(env: StripeEnv): string | undefined {
  return env === "sandbox"
    ? optionalEnv("STRIPE_SANDBOX_API_KEY")
    : optionalEnv("STRIPE_LIVE_API_KEY");
}

/**
 * Prefer STRIPE_SECRET_KEY_* so Boliviq can deploy independently.
 * If the legacy Lovable connection var is actually a Stripe secret key
 * (as .env.example historically documented), use it as a direct key too.
 */
export function getDirectStripeSecretKey(env: StripeEnv): string | undefined {
  const preferred = env === "sandbox"
    ? optionalEnv("STRIPE_SECRET_KEY_TEST")
    : optionalEnv("STRIPE_SECRET_KEY_LIVE");
  if (preferred) return preferred;

  const legacy = getLegacyConnectionApiKey(env);
  if (isDirectStripeSecret(legacy)) return legacy;
  return undefined;
}

export function isStripeApiConfigured(env: StripeEnv): boolean {
  return !!getDirectStripeSecretKey(env) || (!!getLegacyConnectionApiKey(env) && !!optionalEnv("LOVABLE_API_KEY"));
}

export function describeStripeApiKeyConfig(env: StripeEnv): { configured: boolean; detail: string } {
  const preferredName = env === "sandbox" ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY_LIVE";
  const legacyName = env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY";
  if (optionalEnv(preferredName)) {
    return { configured: true, detail: `${preferredName} exists.` };
  }
  const legacy = optionalEnv(legacyName);
  if (isDirectStripeSecret(legacy)) {
    return { configured: true, detail: `${legacyName} is a direct Stripe secret key.` };
  }
  if (legacy && optionalEnv("LOVABLE_API_KEY")) {
    return { configured: true, detail: `${legacyName} + LOVABLE_API_KEY (Lovable connector) exist.` };
  }
  if (legacy) {
    return {
      configured: false,
      detail: `${legacyName} is set but is not a Stripe secret key (sk_/rk_) and LOVABLE_API_KEY is missing.`,
    };
  }
  return { configured: false, detail: `${preferredName} (or ${legacyName}) is missing.` };
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

export function describeStripeWebhookConfig(env: StripeEnv): { configured: boolean; detail: string } {
  const preferred = env === "sandbox" ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE";
  const legacy = env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET";
  if (optionalEnv(preferred)) return { configured: true, detail: `${preferred} exists.` };
  if (optionalEnv(legacy)) return { configured: true, detail: `${legacy} exists.` };
  return { configured: false, detail: `${preferred} (or ${legacy}) is missing.` };
}

function timingSafeEqualHex(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i]! ^ b[i]!;
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
    if (key === "v1" && value) v1Signatures.push(value);
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
  if (!v1Signatures.some((candidate) => timingSafeEqualHex(expected, candidate))) {
    throw new Error("Invalid webhook signature");
  }

  const parsed = JSON.parse(body);
  if (!parsed?.id || typeof parsed.id !== "string") throw new Error("Webhook payload missing event id");
  return parsed;
}
