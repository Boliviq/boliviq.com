import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertMasterAdminUser, isAdminUser, isMasterAdminUser } from "@/lib/assert-admin";
import { plans, type Plan } from "@/lib/plans";
import {
  applyPriceOverrides,
  mergePriceRows,
  type PlanPriceRow,
} from "@/lib/plan-catalog";
import { listBillingOptions } from "@/lib/checkout-config";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  isStripeApiConfigured,
} from "@/lib/stripe.server";

export async function loadCatalogPlans(): Promise<Plan[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("plan_prices").select("tier, monthly, annual, extra_seat_monthly");
    if (error || !data?.length) return plans;
    return applyPriceOverrides(plans, data as PlanPriceRow[]);
  } catch {
    return plans;
  }
}

function toPriceRow(row: { tier: string; monthly: number | string; annual: number | string; extra_seat_monthly?: number | string | null }): PlanPriceRow {
  return {
    tier: row.tier,
    monthly: Number(row.monthly),
    annual: Number(row.annual),
    extra_seat_monthly: row.extra_seat_monthly == null || row.extra_seat_monthly === "" ? null : Number(row.extra_seat_monthly),
  };
}

export const getPlanPricingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plan_prices")
      .select("tier, monthly, annual, extra_seat_monthly, updated_at, updated_by");
    if (error) throw new Error(error.message);
    const rows = mergePriceRows((data ?? []).map(toPriceRow));
    return {
      isMasterAdmin: await isMasterAdminUser(context.userId),
      rows,
      catalog: applyPriceOverrides(plans, rows),
    };
  });

const saveInput = z.object({
  environment: z.enum(["sandbox", "live"]),
  syncStripe: z.boolean(),
  rows: z.array(
    z.object({
      tier: z.enum(["free", "beginner", "professional", "professional_ai_max", "team", "team_ai_max"]),
      monthly: z.number().min(0).max(1_000_000),
      annual: z.number().min(0).max(1_000_000),
      extra_seat_monthly: z.number().min(0).max(1_000_000).nullable(),
    }),
  ).min(1),
});

async function syncLookupKey(params: {
  stripe: ReturnType<typeof createStripeClient>;
  lookupKey: string;
  amount: number;
  interval: "month" | "year";
  productName: string;
}): Promise<{ lookupKey: string; status: "unchanged" | "updated" | "created" | "skipped"; message?: string }> {
  const { stripe, lookupKey, amount, interval, productName } = params;
  if (amount <= 0) return { lookupKey, status: "skipped", message: "Zero-amount prices are not created in Stripe." };

  const unitAmount = Math.round(amount * 100);
  const list = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 10 });
  const active = list.data.filter((price) => price.active);
  const current = active[0] ?? list.data[0];
  if (current?.active && current.unit_amount === unitAmount && current.recurring?.interval === interval && current.currency === "usd") {
    return { lookupKey, status: "unchanged" };
  }

  let productId: string | undefined;
  if (current) {
    productId = typeof current.product === "string" ? current.product : current.product?.id;
  }
  if (!productId) {
    const created = await stripe.products.create({
      name: productName,
      metadata: { boliviq_lookup_key: lookupKey },
    });
    productId = created.id;
  }

  await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { boliviq_lookup_key: lookupKey },
  });
  return { lookupKey, status: current ? "updated" : "created" };
}

export const savePlanPricingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => saveInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertMasterAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const normalized = mergePriceRows(data.rows);
    const free = normalized.find((row) => row.tier === "free");
    if (free && (free.monthly !== 0 || free.annual !== 0)) {
      throw new Error("The Free plan must stay $0.");
    }

    for (const row of normalized) {
      const { error } = await supabaseAdmin.from("plan_prices").upsert({
        tier: row.tier,
        monthly: row.monthly,
        annual: row.annual,
        extra_seat_monthly: row.extra_seat_monthly,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }

    const catalog = applyPriceOverrides(plans, normalized);
    const stripeResults: Array<{ lookupKey: string; status: string; message?: string }> = [];

    if (data.syncStripe) {
      if (!isStripeApiConfigured(data.environment as StripeEnv)) {
        return {
          ok: true as const,
          catalog,
          rows: normalized,
          stripeSynced: false,
          stripeResults: [{ lookupKey: "*", status: "skipped", message: "Stripe is not configured for this environment. Catalog prices were saved." }],
        };
      }
      const stripe = createStripeClient(data.environment as StripeEnv);
      for (const option of listBillingOptions(catalog)) {
        try {
          stripeResults.push(await syncLookupKey({
            stripe,
            lookupKey: option.lookupKey,
            amount: option.amount,
            interval: option.interval,
            productName: option.planName,
          }));
        } catch (error) {
          stripeResults.push({ lookupKey: option.lookupKey, status: "error", message: getStripeErrorMessage(error) });
        }
      }
      for (const plan of catalog) {
        if (plan.extraSeatMonthly == null || !plan.priceMonthly) continue;
        const lookupKey = `${plan.tier}_extra_seat_monthly`;
        try {
          stripeResults.push(await syncLookupKey({
            stripe,
            lookupKey,
            amount: plan.extraSeatMonthly,
            interval: "month",
            productName: `${plan.name} extra seat`,
          }));
        } catch (error) {
          stripeResults.push({ lookupKey, status: "error", message: getStripeErrorMessage(error) });
        }
      }
    }

    return {
      ok: true as const,
      catalog,
      rows: normalized,
      stripeSynced: data.syncStripe,
      stripeResults,
    };
  });
