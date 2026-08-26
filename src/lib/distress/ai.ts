/**
 * Distressed-property AI helpers.
 * FACT = recorded source data; ESTIMATE = Boliviq calc; INFERENCE = AI conclusion.
 * Never present inference as recorded fact.
 */

import type { CanonicalPropertyRecord, DistressEventRecord } from "./types";
import { SUBTYPE_LABELS } from "./taxonomy";
import { DISTRESS_DISCLAIMER } from "./types";
import { analyzeFlip, analyzeRental, mao } from "@/lib/deal-calc";

export type AiClaimKind = "FACT" | "ESTIMATE" | "INFERENCE";

export type AiClaim = {
  kind: AiClaimKind;
  text: string;
};

export type DistressAiRequest =
  | "explain_distress"
  | "foreclosure_timeline"
  | "acquisition_strategy"
  | "investor_offer"
  | "rehab_estimate"
  | "arv_estimate"
  | "liens_debt"
  | "auction_opportunity"
  | "owner_outreach"
  | "cold_call_script"
  | "text_message"
  | "email"
  | "direct_mail"
  | "exit_strategies"
  | "flip_vs_rental"
  | "wholesale_vs_rehab"
  | "title_risks"
  | "next_foreclosure_step";

export function buildDistressAiBrief(
  property: CanonicalPropertyRecord,
  events: DistressEventRecord[],
  request: DistressAiRequest,
): { title: string; claims: AiClaim[]; disclaimer: string; creditCostHint: number } {
  const active = events.filter((e) => ["active", "scheduled", "postponed"].includes(e.status));
  const claims: AiClaim[] = [];

  const pushFact = (text: string) => claims.push({ kind: "FACT", text });
  const pushEst = (text: string) => claims.push({ kind: "ESTIMATE", text });
  const pushInf = (text: string) => claims.push({ kind: "INFERENCE", text });

  pushFact(`Address: ${property.addressRaw ?? property.addressNormalized}`);
  if (property.city && property.stateCode) {
    pushFact(`Location: ${property.city}, ${property.stateCode} ${property.zip ?? ""}`.trim());
  }
  if (property.isDemo) pushFact("This record is DEMO / TEST DATA — not a live government filing.");

  for (const e of active) {
    pushFact(
      `Active signal: ${SUBTYPE_LABELS[e.subtype] ?? e.subtype} (status ${e.status}${
        e.filingDate ? `, filed ${e.filingDate}` : ""
      }${e.auctionDate ? `, auction ${e.auctionDate}` : ""}) — source confidence ${e.confidenceScore}/100.`,
    );
  }

  if (property.distressScore != null) {
    pushEst(
      `Boliviq Distress Score: ${property.distressScore}/100 (version ${property.scoreVersion ?? "v1"}).`,
    );
  }
  if (property.opportunityScore != null) {
    pushEst(`Boliviq Opportunity Score: ${property.opportunityScore}/100.`);
  }
  if (property.estimatedValue != null)
    pushEst(`Estimated value: $${property.estimatedValue.toLocaleString()}.`);
  if (property.estimatedArv != null)
    pushEst(`Estimated ARV: $${property.estimatedArv.toLocaleString()}.`);
  if (property.estimatedRehab != null)
    pushEst(`Estimated rehab: $${property.estimatedRehab.toLocaleString()}.`);
  if (property.loanBalance != null)
    pushEst(`Estimated loan balance: $${property.loanBalance.toLocaleString()}.`);
  if (property.delinquentTaxes != null) {
    pushFact(
      `Reported delinquent taxes: $${property.delinquentTaxes.toLocaleString()} (verify with taxing authority).`,
    );
  }
  if (property.openingBid != null)
    pushFact(`Opening bid (source): $${property.openingBid.toLocaleString()}.`);

  const purchase =
    property.openingBid ?? property.loanBalance ?? Math.round((property.estimatedValue ?? 0) * 0.7);
  const rehab = property.estimatedRehab ?? 0;
  const arv = property.estimatedArv ?? property.estimatedValue ?? 0;

  switch (request) {
    case "explain_distress":
      pushInf(
        `This property shows ${active.length} active independent distress signal(s). Combined scoring weights foreclosure timing, tax delinquency, code/condemnation, and vacancy when present.`,
      );
      break;
    case "foreclosure_timeline": {
      const timeline = [...events].sort((a, b) =>
        String(a.filingDate ?? a.firstSeenAt).localeCompare(String(b.filingDate ?? b.firstSeenAt)),
      );
      for (const e of timeline) {
        pushFact(
          `${e.filingDate ?? e.firstSeenAt.slice(0, 10)} — ${SUBTYPE_LABELS[e.subtype] ?? e.subtype}`,
        );
      }
      pushInf("Timeline is assembled from ingested source dates; gaps may exist between filings.");
      break;
    }
    case "acquisition_strategy":
      pushInf(
        active.some((e) => e.subtype === "auction_scheduled")
          ? "Primary path: auction acquisition with pre-set max bid and title contingency plan."
          : "Primary path: direct owner outreach while monitoring for auction/REO conversion.",
      );
      if (property.absenteeOwner)
        pushInf("Absentee ownership may improve contact leverage via mail + skip-trace.");
      break;
    case "investor_offer": {
      const offer = Math.round(mao(arv, rehab, 0.7, 25000));
      pushEst(
        `Suggested MAO-style offer (70% rule, $25k profit buffer): $${offer.toLocaleString()}.`,
      );
      pushInf("Offer is an estimate only — adjust for liens, taxes, and local auction rules.");
      break;
    }
    case "rehab_estimate":
      pushEst(`Stored rehab estimate: $${rehab.toLocaleString() || "n/a"}.`);
      pushInf("Order a contractor walkthrough before relying on rehab numbers.");
      break;
    case "arv_estimate":
      pushEst(`Stored ARV estimate: $${arv.toLocaleString() || "n/a"}.`);
      pushInf("ARV is not an appraisal; pull comps before capital commitment.");
      break;
    case "liens_debt":
      pushEst(`Loan balance estimate: $${(property.loanBalance ?? 0).toLocaleString()}.`);
      pushFact(
        `Delinquent taxes (reported): $${(property.delinquentTaxes ?? 0).toLocaleString()}.`,
      );
      pushInf("Undiscovered HOA, judgment, or municipal liens may exist — order a title search.");
      break;
    case "auction_opportunity": {
      const auction = active.find((e) => e.auctionDate);
      if (auction?.auctionDate) pushFact(`Auction date on record: ${auction.auctionDate}.`);
      else pushInf("No auction date currently on file.");
      pushEst(
        `Opening bid vs estimated value spread should be verified day-of; dates change frequently.`,
      );
      break;
    }
    case "owner_outreach":
      pushInf(
        `Open with empathy, reference only publicly recorded distress (not medical/personal), and request a conversation about options. Owner on file: ${property.ownerName ?? "unknown"}.`,
      );
      break;
    case "cold_call_script":
      pushInf(
        `Hi, this is [Name] with Boliviq investors. I'm reaching out about the property at ${property.addressNormalized}. I work with owners facing time-sensitive situations and wanted to see if a cash option would be helpful. Is now a bad time?`,
      );
      break;
    case "text_message":
      pushInf(
        `Hi — investors here regarding ${property.addressNormalized}. If a flexible cash offer would help, reply YES and I'll send details. Opt out: STOP.`,
      );
      break;
    case "email":
      pushInf(
        `Subject: Options for ${property.addressNormalized}\n\nI help owners evaluate sale options when properties face tax, code, or foreclosure pressure. Happy to share a no-obligation cash range if useful.`,
      );
      break;
    case "direct_mail":
      pushInf(
        `Dear Property Owner,\n\nI'm an investor interested in ${property.addressNormalized}. If you'd like a straightforward cash offer, call or text [phone].\n\nSincerely,\n[Name]`,
      );
      break;
    case "exit_strategies":
      pushInf(
        "Compare: retail flip, BRRRR/rental hold, wholesale assignment, or auction flip depending on capital and timeline.",
      );
      break;
    case "flip_vs_rental": {
      if (arv > 0) {
        const flip = analyzeFlip({
          purchasePrice: purchase,
          rehab,
          arv,
          closingBuyPct: 2,
          closingSellPct: 2,
          holdingMonths: 6,
          monthlyHolding: 800,
          financingCost: 5000,
          sellingCostsPct: 6,
        });
        pushEst(`Flip net profit estimate: $${Math.round(flip.netProfit).toLocaleString()}.`);
        const rental = analyzeRental({
          purchasePrice: purchase,
          rehab,
          downPct: 25,
          ratePct: 8.5,
          loanYears: 30,
          monthlyRent: property.monthlyRentEst ?? Math.round(arv * 0.008),
          vacancyPct: 8,
          maintenancePct: 8,
          mgmtPct: 8,
          taxesAnnual: 2400,
          insuranceAnnual: 1400,
          utilitiesMonthly: 0,
          hoaMonthly: 50,
          capexPct: 5,
        });
        pushEst(
          `Rental annual cash-flow estimate: $${Math.round(rental.annualCashFlow).toLocaleString()}.`,
        );
      }
      pushInf("Flip favors speed/equity spread; rental favors cash-flow markets and longer hold.");
      break;
    }
    case "wholesale_vs_rehab":
      pushInf(
        "Wholesale if assignment fee clears with light diligence; rehab if you control capital and can capture ARV spread after repairs.",
      );
      break;
    case "title_risks":
      pushInf(
        "Title risks may include junior liens, municipal assessments, broken chain of title, occupant rights, and redemption periods. Obtain counsel and a title commitment before funding.",
      );
      break;
    case "next_foreclosure_step": {
      const hasAuction = active.some((e) => e.subtype === "auction_scheduled");
      const hasNod = active.some(
        (e) => e.subtype === "notice_of_default" || e.subtype === "foreclosure_filed",
      );
      if (hasAuction)
        pushInf("Likely next step: auction conducted or postponed — monitor docket daily.");
      else if (hasNod)
        pushInf("Likely next step: sale scheduling or cure window depending on state process.");
      else pushInf("Insufficient foreclosure filings to project the next procedural step.");
      break;
    }
  }

  return {
    title: request.replaceAll("_", " "),
    claims,
    disclaimer: DISTRESS_DISCLAIMER,
    creditCostHint: 10,
  };
}
