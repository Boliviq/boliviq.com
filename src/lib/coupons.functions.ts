import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ValidatedCoupon = {
  id: string;
  code: string;
  name: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  admin_only: boolean;
  restricted_plan: string | null;
};

export type ValidateResult =
  | { ok: true; coupon: ValidatedCoupon; discount: number; total: number }
  | { ok: false; error: string };

function computeDiscount(type: "percentage" | "fixed", value: number, amount: number): number {
  if (type === "percentage") return Math.min(amount, +(amount * (value / 100)).toFixed(2));
  return Math.min(amount, +Number(value).toFixed(2));
}

const validateInput = z.object({
  code: z.string().trim().min(1).max(64),
  plan: z.string().trim().min(1).max(64),
  amount: z.number().nonnegative().max(1_000_000),
});

/**
 * Validate a coupon code server-side. Bypasses RLS via service role so we can
 * enforce admin-only rules ourselves (RLS hides admin/hidden coupons from
 * regular users). Never returns hidden coupons to non-admin callers.
 */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => validateInput.parse(data))
  .handler(async ({ data, context }): Promise<ValidateResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim();

    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (error) return { ok: false, error: "Could not validate coupon." };
    if (!coupon) return { ok: false, error: "Coupon code not found." };
    if (!coupon.active) return { ok: false, error: "This coupon is not active." };

    const now = Date.now();
    if (coupon.start_date && new Date(coupon.start_date).getTime() > now) {
      return { ok: false, error: "This coupon isn't active yet." };
    }
    if (coupon.expiration_date && new Date(coupon.expiration_date).getTime() < now) {
      return { ok: false, error: "This coupon has expired." };
    }
    if (coupon.max_total_uses != null && coupon.current_uses >= coupon.max_total_uses) {
      return { ok: false, error: "This coupon has reached its usage limit." };
    }
    if (
      coupon.restricted_plan &&
      coupon.restricted_plan.toLowerCase() !== data.plan.toLowerCase()
    ) {
      return {
        ok: false,
        error: `This coupon only applies to the ${coupon.restricted_plan} plan.`,
      };
    }

    if (coupon.admin_only) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) return { ok: false, error: "Coupon code not found." };
    }

    if (coupon.max_uses_per_customer != null) {
      const { count } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", context.userId);
      if ((count ?? 0) >= coupon.max_uses_per_customer && !coupon.admin_only) {
        return { ok: false, error: "You've already used this coupon." };
      }
    }

    const discount = computeDiscount(
      coupon.discount_type,
      Number(coupon.discount_value),
      data.amount,
    );
    const total = Math.max(0, +(data.amount - discount).toFixed(2));

    return {
      ok: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        admin_only: coupon.admin_only,
        restricted_plan: coupon.restricted_plan,
      },
      discount,
      total,
    };
  });

const redeemInput = z.object({
  code: z.string().trim().min(1).max(64),
  plan: z.string().trim().min(1).max(64),
  amount: z.number().nonnegative().max(1_000_000),
});

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => redeemInput.parse(data))
  .handler(async ({ data, context }) => {
    // Re-validate server-side before recording the redemption
    const result = await validateCoupon({ data });
    if (!result.ok) throw new Error(result.error);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("coupon_redemptions").insert({
      coupon_id: result.coupon.id,
      coupon_code: result.coupon.code,
      user_id: context.userId,
      plan: data.plan,
      order_amount: data.amount,
      discount_amount: result.discount,
    });
    if (insErr) throw new Error("Failed to log redemption.");

    // Increment usage (skip for admin-only unlimited coupons)
    if (!result.coupon.admin_only) {
      const { data: current } = await supabaseAdmin
        .from("coupons")
        .select("current_uses")
        .eq("id", result.coupon.id)
        .maybeSingle();
      await supabaseAdmin
        .from("coupons")
        .update({ current_uses: (current?.current_uses ?? 0) + 1 })
        .eq("id", result.coupon.id);
    }

    return { ok: true as const, discount: result.discount, total: result.total };
  });
