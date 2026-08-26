/** Deal Risk Intelligence — early-warning signals with provenance. Not a title search. */

import { OS_DISCLAIMERS } from "./entitlements";

export type RiskSignal = {
  key: string;
  label: string;
  level: "green" | "yellow" | "red";
  points: number;
  provenance: "verified" | "provider_data" | "estimate" | "ai_inference" | "demo";
  sourceLabel: string;
  detail: string;
};

export type DealRiskInput = {
  activeSubtypes?: string[];
  delinquentTaxes?: number | null;
  estimatedLiens?: number | null;
  auctionDate?: string | null;
  openPermits?: number;
  ownershipMatched?: boolean;
  hoaLienSuspected?: boolean;
  floodZone?: boolean;
  zoningConflict?: boolean;
  isDemo?: boolean;
};

export type DealRiskResult = {
  overallLevel: "green" | "yellow" | "red";
  riskScore: number;
  signals: RiskSignal[];
  scoreVersion: string;
  disclaimer: string;
  calculatedAt: string;
};

export function assessDealRisk(input: DealRiskInput): DealRiskResult {
  const signals: RiskSignal[] = [];
  const demo = !!input.isDemo;
  const prov = demo ? ("demo" as const) : ("provider_data" as const);

  const subtypes = new Set(input.activeSubtypes ?? []);
  if (
    subtypes.has("auction_scheduled") ||
    subtypes.has("sheriff_sale") ||
    subtypes.has("trustee_sale")
  ) {
    const days = input.auctionDate
      ? Math.ceil((new Date(input.auctionDate).getTime() - Date.now()) / 86400000)
      : null;
    signals.push({
      key: "auction",
      label: "Foreclosure / auction scheduled",
      level: "red",
      points: 40,
      provenance: prov,
      sourceLabel: demo ? "DEMO county trustee" : "Distress event",
      detail:
        days != null
          ? `Auction on record in ~${days} days (dates change — verify).`
          : "Auction/sale signal present on distress record.",
    });
  }
  if (
    subtypes.has("foreclosure_filed") ||
    subtypes.has("notice_of_default") ||
    subtypes.has("lis_pendens")
  ) {
    signals.push({
      key: "foreclosure_filed",
      label: "Foreclosure filing",
      level: "yellow",
      points: 18,
      provenance: prov,
      sourceLabel: "Distress event",
      detail: "Active foreclosure-related filing requires title/legal review.",
    });
  }
  if (
    subtypes.has("tax_delinquent") ||
    subtypes.has("tax_lien") ||
    (input.delinquentTaxes ?? 0) > 0
  ) {
    signals.push({
      key: "tax",
      label: "Tax delinquency / tax lien",
      level: "yellow",
      points: 15,
      provenance: prov,
      sourceLabel: "Tax / distress source",
      detail: `Reported delinquent amount $${Math.round(input.delinquentTaxes ?? 0).toLocaleString()} (verify with taxing authority).`,
    });
  }
  if (
    subtypes.has("condemned") ||
    subtypes.has("demolition_order") ||
    subtypes.has("unsafe_structure")
  ) {
    signals.push({
      key: "condemnation",
      label: "Condemnation / unsafe / demolition",
      level: "red",
      points: 35,
      provenance: prov,
      sourceLabel: "Code / building source",
      detail: "Potential acquisition blocker — verify official order before bidding.",
    });
  }
  if (subtypes.has("code_violation") || subtypes.has("nuisance")) {
    signals.push({
      key: "code",
      label: "Code / nuisance case",
      level: "yellow",
      points: 10,
      provenance: prov,
      sourceLabel: "Code enforcement",
      detail: "Open code issues may add cure costs and delay closing.",
    });
  }
  if ((input.estimatedLiens ?? 0) > 5000) {
    signals.push({
      key: "liens",
      label: "Estimated liens",
      level: "yellow",
      points: 12,
      provenance: "estimate",
      sourceLabel: "Boliviq estimate",
      detail: `Estimated liens $${Math.round(input.estimatedLiens!).toLocaleString()} — not a title commitment.`,
    });
  }
  if ((input.openPermits ?? 0) > 0) {
    signals.push({
      key: "open_permits",
      label: "Open permits",
      level: "yellow",
      points: 8,
      provenance: prov,
      sourceLabel: "Permit history",
      detail: `${input.openPermits} open permit(s) may indicate unfinished work.`,
    });
  }
  if (input.hoaLienSuspected) {
    signals.push({
      key: "hoa",
      label: "Possible HOA lien",
      level: "yellow",
      points: 10,
      provenance: "ai_inference",
      sourceLabel: "Inference",
      detail: "Possible HOA exposure — confirm with HOA/estoppel.",
    });
  }
  if (input.floodZone) {
    signals.push({
      key: "flood",
      label: "Flood zone flag",
      level: "yellow",
      points: 8,
      provenance: prov,
      sourceLabel: "Flood data",
      detail: "Flood designation may affect insurance and financing.",
    });
  }
  if (input.zoningConflict) {
    signals.push({
      key: "zoning",
      label: "Zoning conflict indicator",
      level: "yellow",
      points: 10,
      provenance: "estimate",
      sourceLabel: "Zoning snapshot",
      detail: "Possible zoning conflict — verify with planning department.",
    });
  }
  if (input.ownershipMatched !== false) {
    signals.push({
      key: "ownership",
      label: "Ownership matched",
      level: "green",
      points: 0,
      provenance: prov,
      sourceLabel: "Property identity",
      detail: "No ownership mismatch detected in available records.",
    });
  }

  const riskScore = Math.min(
    100,
    signals.filter((s) => s.level !== "green").reduce((a, s) => a + s.points, 0),
  );
  const hasRed = signals.some((s) => s.level === "red");
  const hasYellow = signals.some((s) => s.level === "yellow");
  const overallLevel = hasRed ? "red" : hasYellow ? "yellow" : "green";

  return {
    overallLevel,
    riskScore,
    signals,
    scoreVersion: "v1",
    disclaimer: OS_DISCLAIMERS.risk,
    calculatedAt: new Date().toISOString(),
  };
}
