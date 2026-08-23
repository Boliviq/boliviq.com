import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  chargeCredits,
  grantCredits,
  loadCreditWallet,
  refundCredits,
  releaseCredits,
  reserveCredits,
  type CreditWalletSnapshot,
} from "@/lib/credits";

const amountInput = z.object({
  amount: z.number().positive().max(1_000_000),
  label: z.string().trim().min(1).max(160),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const getCreditWalletSnapshotFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<CreditWalletSnapshot> =>
      loadCreditWallet(context.supabase, context.userId),
  );

export const reserveCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => amountInput.parse(d))
  .handler(async ({ data, context }) => reserveCredits(context.supabase, context.userId, data));

export const chargeCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => amountInput.extend({ reservationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => chargeCredits(context.supabase, context.userId, data));

export const releaseCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => amountInput.extend({ reservationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => releaseCredits(context.supabase, context.userId, data));

export const refundCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    amountInput.extend({ reservationId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => refundCredits(context.supabase, context.userId, data));

export const grantCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        walletId: z.string().uuid(),
        amount: z
          .number()
          .min(-1_000_000)
          .max(1_000_000)
          .refine((n) => n !== 0, "Amount cannot be zero"),
        label: z.string().trim().min(1).max(160),
        idempotencyKey: z.string().trim().min(8).max(120),
        operation: z.enum(["promotional_grant", "referral_reward", "admin_adjust"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => grantCredits(context.supabase, context.userId, data));
