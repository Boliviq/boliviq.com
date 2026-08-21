import { plans, type Plan, type PlanTier } from "@/lib/plans";

export type PlanPriceRow = {
  tier: string;
  monthly: number;
  annual: number;
  extra_seat_monthly: number | null;
};

export function formatSeatNote(includedSeats: number, extraSeatMonthly: number): string {
  if (extraSeatMonthly <= 0) return `${includedSeats} users included`;
  return `${includedSeats} users included · $${extraSeatMonthly}/mo per additional seat`;
}

export function defaultPlanPriceRows(): PlanPriceRow[] {
  return plans.map((plan) => ({
    tier: plan.tier,
    monthly: plan.monthly,
    annual: plan.annual,
    extra_seat_monthly: plan.extraSeatMonthly ?? null,
  }));
}

export function applyPriceOverrides(base: Plan[], rows: PlanPriceRow[]): Plan[] {
  const map = new Map(rows.map((row) => [row.tier, row]));
  return base.map((plan) => {
    const row = map.get(plan.tier);
    if (!row) return plan;
    const extra = row.extra_seat_monthly == null ? plan.extraSeatMonthly : Number(row.extra_seat_monthly);
    return {
      ...plan,
      monthly: Number(row.monthly),
      annual: Number(row.annual),
      extraSeatMonthly: extra,
      seatNote:
        plan.includedSeats && extra != null
          ? formatSeatNote(plan.includedSeats, extra)
          : plan.seatNote,
    };
  });
}

export function mergePriceRows(rows: PlanPriceRow[]): PlanPriceRow[] {
  const map = new Map(defaultPlanPriceRows().map((row) => [row.tier, row]));
  for (const row of rows) {
    if (!map.has(row.tier)) continue;
    map.set(row.tier, {
      tier: row.tier,
      monthly: Number(row.monthly),
      annual: Number(row.annual),
      extra_seat_monthly: row.extra_seat_monthly == null ? map.get(row.tier)!.extra_seat_monthly : Number(row.extra_seat_monthly),
    });
  }
  return Array.from(map.values());
}

export const ADJUSTABLE_PLAN_TIERS: PlanTier[] = plans.map((plan) => plan.tier);
