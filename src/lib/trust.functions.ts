import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listPendingVerifications,
  reviewVerification,
  type VerificationRequest,
} from "@/lib/trust";

export const listPendingVerificationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<VerificationRequest[]> =>
      listPendingVerifications(context.supabase, context.userId),
  );

export const reviewVerificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["granted", "rejected"]),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(d),
  )
  .handler(
    async ({ data, context }): Promise<VerificationRequest> =>
      reviewVerification(context.supabase, context.userId, data),
  );
