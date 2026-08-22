/**
 * Centralized subscription-status mapping for Boliviq.
 *
 * Access rule (source of truth — mirror in UI + server checks):
 *
 *  ENTITLED to paid features:
 *    - active
 *    - trialing
 *    - past_due       ← short grace period; Stripe retries automatically.
 *                       We keep access while Stripe tries the card again;
 *                       if it exhausts retries Stripe transitions the sub
 *                       to `unpaid` / `canceled` and we revoke.
 *    - owner_grant    ← Boliviq-side grant (100%-off / admin coupon).
 *
 *  BLOCKED from paid features:
 *    - unpaid
 *    - incomplete
 *    - incomplete_expired
 *    - paused
 *    - canceled (unless current_period_end is still in the future — end-of-period access)
 *    - none
 *
 *  We NEVER grant access from URL query parameters or client state — access
 *  is derived from the `subscriptions` table, which is only written by the
 *  Stripe webhook (service role) or admin-only grant flow.
 */

export type NormalizedStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "canceled"
  | "owner_grant"
  | "none";

/** States that must BLOCK a second Stripe checkout (avoid duplicate subs). */
export const BLOCKING_SUB_STATES: NormalizedStatus[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
];

export function normalizeStatus(
  row:
    | {
        status?: string | null;
        stripe_customer_id?: string | null;
        current_period_end?: string | null;
      }
    | null
    | undefined,
): NormalizedStatus {
  if (!row || !row.status) return "none";
  if (row.stripe_customer_id?.startsWith("boliviq_grant_")) return "owner_grant";
  const s = row.status.toLowerCase();
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    case "canceled":
      return s as NormalizedStatus;
    default:
      return "none";
  }
}

export function hasPaidAccess(row: Parameters<typeof normalizeStatus>[0]): boolean {
  const s = normalizeStatus(row);
  if (s === "active" || s === "trialing" || s === "past_due" || s === "owner_grant") return true;
  if (s === "canceled" && row?.current_period_end) {
    return new Date(row.current_period_end).getTime() > Date.now();
  }
  return false;
}

export function statusLabel(s: NormalizedStatus): string {
  const map: Record<NormalizedStatus, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment past due",
    unpaid: "Unpaid",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    paused: "Paused",
    canceled: "Canceled",
    owner_grant: "Owner grant",
    none: "No subscription",
  };
  return map[s];
}

/** Boliviq's canonical plan catalog for diagnostics (source: src/lib/plans.ts). */
import { listBillingOptions } from "@/lib/checkout-config";

export const EXPECTED_PLANS: Array<{
  lookupKey: string;
  amount: number;
  interval: "month" | "year";
}> = listBillingOptions().map((option) => ({
  lookupKey: option.lookupKey,
  amount: option.amount,
  interval: option.interval,
}));
