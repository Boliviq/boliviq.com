import { describe, expect, test } from "vitest";
import { plans } from "../src/lib/plans";
import { applyPriceOverrides, formatSeatNote, mergePriceRows } from "../src/lib/plan-catalog";
import { getBillingOption, listBillingOptions } from "../src/lib/checkout-config";

describe("plan catalog price overrides", () => {
  test("applyPriceOverrides updates monthly, annual, and extra-seat copy", () => {
    const next = applyPriceOverrides(plans, [
      { tier: "beginner", monthly: 59, annual: 590, extra_seat_monthly: null },
      { tier: "team", monthly: 420, annual: 4000, extra_seat_monthly: 129 },
    ]);
    const beginner = next.find((plan) => plan.tier === "beginner");
    const team = next.find((plan) => plan.tier === "team");
    expect(beginner?.monthly).toBe(59);
    expect(beginner?.annual).toBe(590);
    expect(team?.monthly).toBe(420);
    expect(team?.extraSeatMonthly).toBe(129);
    expect(team?.seatNote).toBe("5 users included · $129/mo per additional seat");
  });

  test("listBillingOptions uses overridden amounts for checkout", () => {
    const catalog = applyPriceOverrides(plans, [
      { tier: "professional", monthly: 199, annual: 1900, extra_seat_monthly: null },
    ]);
    const monthly = getBillingOption("professional", "month", catalog);
    const yearly = getBillingOption("professional", "year", catalog);
    expect(monthly.amount).toBe(199);
    expect(yearly.amount).toBe(1900);
    expect(monthly.lookupKey).toBe("pro_v2_monthly");
    expect(listBillingOptions(catalog).every((option) => option.amount >= 0)).toBe(true);
  });

  test("mergePriceRows keeps default tiers when a row is missing", () => {
    const merged = mergePriceRows([{ tier: "beginner", monthly: 10, annual: 100, extra_seat_monthly: null }]);
    expect(merged).toHaveLength(plans.length);
    expect(merged.find((row) => row.tier === "beginner")?.monthly).toBe(10);
    expect(merged.find((row) => row.tier === "professional")?.monthly).toBe(149);
  });

  test("formatSeatNote handles a zero extra-seat price", () => {
    expect(formatSeatNote(5, 0)).toBe("5 users included");
  });
});
