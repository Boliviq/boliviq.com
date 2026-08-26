/** Boliviq Distress Score + Opportunity Score (transparent, admin-tunable weights). */

import type { DistressSubtype } from "./taxonomy";
import { SUBTYPE_LABELS } from "./taxonomy";

export const DEFAULT_DISTRESS_WEIGHTS: Record<string, number> = {
  auction_scheduled: 30,
  foreclosure_filed: 22,
  notice_of_default: 18,
  lis_pendens: 16,
  trustee_sale: 28,
  sheriff_sale: 28,
  reo: 24,
  tax_delinquent: 12,
  tax_delinquent_multi_year: 20,
  tax_lien: 14,
  tax_lien_sale: 18,
  tax_deed_sale: 22,
  condemned: 25,
  demolition_order: 22,
  unsafe_structure: 18,
  dangerous_building: 18,
  code_violation: 10,
  nuisance: 8,
  vacant: 8,
  abandoned_property: 12,
  zombie_foreclosure: 15,
  absentee_owner: 8,
  land_bank: 16,
  government_owned: 14,
  multiple_independent_sources: 10,
  repeated_violations: 8,
  substantial_estimated_equity: 6,
};

export const DEFAULT_OPPORTUNITY_WEIGHTS = {
  distress: 0.35,
  estimated_equity: 0.2,
  potential_spread: 0.15,
  opening_bid_discount: 0.1,
  rental_potential: 0.08,
  days_in_distress: 0.07,
  ownership_duration: 0.05,
};

export type ScoreSignal = {
  key: string;
  label: string;
  points: number;
};

export type DistressScoreInput = {
  activeSubtypes: string[];
  independentSourceCount?: number;
  taxDelinquentYears?: number;
  repeatedViolations?: number;
  estimatedEquity?: number | null;
  estimatedValue?: number | null;
  governmentOwned?: boolean;
};

export type DistressScoreResult = {
  total: number;
  components: Record<string, number>;
  signals: ScoreSignal[];
  version: string;
  calculatedAt: string;
};

export function calculateDistressScore(
  input: DistressScoreInput,
  weights: Record<string, number> = DEFAULT_DISTRESS_WEIGHTS,
  version = "v1",
): DistressScoreResult {
  const components: Record<string, number> = {};
  const signals: ScoreSignal[] = [];

  const add = (key: string, label: string, points: number) => {
    if (points <= 0) return;
    components[key] = (components[key] ?? 0) + points;
    signals.push({ key, label, points });
  };

  const seen = new Set<string>();
  for (const subtype of input.activeSubtypes) {
    if (seen.has(subtype)) continue;
    seen.add(subtype);
    const w = weights[subtype] ?? 0;
    if (w > 0) {
      add(subtype, SUBTYPE_LABELS[subtype as DistressSubtype] ?? subtype, w);
    }
  }

  if ((input.taxDelinquentYears ?? 0) >= 3) {
    // replace single-year tax points with multi-year when applicable
    if (components.tax_delinquent) {
      const delta = (weights.tax_delinquent_multi_year ?? 20) - components.tax_delinquent;
      if (delta > 0) {
        add("tax_delinquent_multi_year", `${input.taxDelinquentYears} years tax delinquent`, delta);
      }
    } else {
      add(
        "tax_delinquent_multi_year",
        `${input.taxDelinquentYears} years tax delinquent`,
        weights.tax_delinquent_multi_year ?? 20,
      );
    }
  }

  if ((input.independentSourceCount ?? 0) >= 2) {
    add(
      "multiple_independent_sources",
      `${input.independentSourceCount} independent distress sources`,
      weights.multiple_independent_sources ?? 10,
    );
  }

  if ((input.repeatedViolations ?? 0) >= 2) {
    add(
      "repeated_violations",
      `Repeated violations (${input.repeatedViolations})`,
      weights.repeated_violations ?? 8,
    );
  }

  if (input.governmentOwned) {
    add("government_owned", "Government / inventory ownership", weights.government_owned ?? 14);
  }

  const equity = input.estimatedEquity ?? 0;
  const value = input.estimatedValue ?? 0;
  if (value > 0 && equity / value >= 0.35) {
    add(
      "substantial_estimated_equity",
      "Substantial estimated equity",
      weights.substantial_estimated_equity ?? 6,
    );
  }

  const raw = Object.values(components).reduce((a, b) => a + b, 0);
  const total = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    total,
    components,
    signals: signals.sort((a, b) => b.points - a.points),
    version,
    calculatedAt: new Date().toISOString(),
  };
}

export type OpportunityScoreInput = {
  distressScore: number;
  estimatedEquity?: number | null;
  estimatedValue?: number | null;
  estimatedArv?: number | null;
  estimatedRehab?: number | null;
  openingBid?: number | null;
  loanBalance?: number | null;
  delinquentTaxes?: number | null;
  potentialSpread?: number | null;
  monthlyRentEst?: number | null;
  daysInDistress?: number | null;
  ownershipDurationMonths?: number | null;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function calculateOpportunityScore(
  input: OpportunityScoreInput,
  weights: typeof DEFAULT_OPPORTUNITY_WEIGHTS = DEFAULT_OPPORTUNITY_WEIGHTS,
  version = "v1",
): DistressScoreResult {
  const components: Record<string, number> = {};
  const signals: ScoreSignal[] = [];

  const distressPart = clamp01(input.distressScore / 100) * 100 * weights.distress;
  components.distress = Math.round(distressPart);
  signals.push({ key: "distress", label: "Distress intensity", points: components.distress });

  const value = input.estimatedValue ?? input.estimatedArv ?? 0;
  const equity = input.estimatedEquity ?? 0;
  const equityPct = value > 0 ? clamp01(equity / value) : 0;
  components.estimated_equity = Math.round(equityPct * 100 * weights.estimated_equity);
  signals.push({
    key: "estimated_equity",
    label: "Estimated equity",
    points: components.estimated_equity,
  });

  let spread = input.potentialSpread ?? null;
  if (spread == null && input.estimatedArv != null) {
    const costs =
      (input.openingBid ?? input.loanBalance ?? 0) +
      (input.estimatedRehab ?? 0) +
      (input.delinquentTaxes ?? 0);
    spread = input.estimatedArv - costs;
  }
  const spreadPct = value > 0 && spread != null ? clamp01(spread / value) : 0;
  components.potential_spread = Math.round(spreadPct * 100 * weights.potential_spread);
  signals.push({
    key: "potential_spread",
    label: "Potential spread",
    points: components.potential_spread,
  });

  const bid = input.openingBid;
  const bidDiscount = bid != null && value > 0 ? clamp01((value - bid) / value) : 0;
  components.opening_bid_discount = Math.round(bidDiscount * 100 * weights.opening_bid_discount);
  signals.push({
    key: "opening_bid_discount",
    label: "Opening bid vs value",
    points: components.opening_bid_discount,
  });

  const rent = input.monthlyRentEst ?? 0;
  const rentYield = value > 0 ? clamp01((rent * 12) / value / 0.12) : 0; // normalize vs ~12% gross
  components.rental_potential = Math.round(rentYield * 100 * weights.rental_potential);
  signals.push({
    key: "rental_potential",
    label: "Rental potential",
    points: components.rental_potential,
  });

  const days = input.daysInDistress ?? 0;
  const daysPart = clamp01(days / 365) * 100 * weights.days_in_distress;
  components.days_in_distress = Math.round(daysPart);
  signals.push({
    key: "days_in_distress",
    label: "Days in distress",
    points: components.days_in_distress,
  });

  const ownMonths = input.ownershipDurationMonths ?? 0;
  const ownPart = clamp01(ownMonths / 120) * 100 * weights.ownership_duration;
  components.ownership_duration = Math.round(ownPart);
  signals.push({
    key: "ownership_duration",
    label: "Ownership duration",
    points: components.ownership_duration,
  });

  const total = Math.max(
    0,
    Math.min(100, Math.round(Object.values(components).reduce((a, b) => a + b, 0))),
  );

  return {
    total,
    components,
    signals: signals.filter((s) => s.points > 0).sort((a, b) => b.points - a.points),
    version,
    calculatedAt: new Date().toISOString(),
  };
}
