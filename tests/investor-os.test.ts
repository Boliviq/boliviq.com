import { describe, expect, it } from "vitest";
import {
  parseAcquisitionPrompt,
  rankAcquisitionMatches,
} from "@/lib/investor-os/acquisition-agent";
import { assessDealRisk } from "@/lib/investor-os/risk-engine";
import {
  compareExitStrategies,
  defaultAssumptionsFromProperty,
} from "@/lib/investor-os/exit-engine";
import { buildConstructionEstimate } from "@/lib/investor-os/construction";
import { demoZoningForCounty } from "@/lib/investor-os/zoning";
import {
  DEMO_BUYERS,
  DEMO_LENDERS,
  scoreBuyerMatch,
  scoreFundingMatch,
} from "@/lib/investor-os/matching";
import { draftOwnerOutreach, isSuppressed, withinCallingHours } from "@/lib/investor-os/outreach";
import { portfolioAssetMetrics, rollupPortfolio } from "@/lib/investor-os/portfolio";
import { scoreRadarMatch } from "@/lib/investor-os/radar";
import { osEntitlementsForPlan } from "@/lib/investor-os/entitlements";
import { ensureDemoStore } from "@/lib/distress/demo-store";

describe("Investor OS — Property Passport foundation", () => {
  it("keeps one canonical demo property across shared store lookups", () => {
    const store = ensureDemoStore();
    const ids = [...store.properties.keys()];
    expect(ids.length).toBeGreaterThan(0);
    const again = ensureDemoStore();
    expect([...again.properties.keys()]).toEqual(ids);
  });

  it("attaches multiple distress events to the same property without duplicating address keys", () => {
    const store = ensureDemoStore();
    const byApn = new Map<string, number>();
    for (const p of store.properties.values()) {
      if (!p.apn) continue;
      byApn.set(p.apn, (byApn.get(p.apn) ?? 0) + 1);
    }
    // Same APN from multi-source demo should collapse to one property
    expect([...byApn.values()].every((n) => n === 1)).toBe(true);
    const propId = [...store.properties.keys()][0];
    const events = [...store.events.values()].filter((e) => e.propertyId === propId);
    expect(events.length).toBeGreaterThan(0);
  });
});

describe("AI Acquisition Agent", () => {
  it("parses natural-language criteria into structured filters", () => {
    const { filters, interpretation } = parseAcquisitionPrompt(
      "Find single-family properties within 75 miles of Nashville with ARV between $300K and $600K minimum 30% equity rehab under $125K distress score above 60 absentee owners preferred.",
    );
    expect(filters.state).toBe("TN");
    expect(filters.radiusMiles).toBe(75);
    expect(filters.arvMin).toBe(300000);
    expect(filters.arvMax).toBe(600000);
    expect(filters.equityPctMin).toBeCloseTo(0.3);
    expect(filters.rehabMax).toBe(125000);
    expect(filters.distressScoreMin).toBe(60);
    expect(filters.absenteePreferred).toBe(true);
    expect(interpretation.length).toBeGreaterThan(3);
  });

  it("ranks matches with explainable reasons", () => {
    const store = ensureDemoStore();
    const props = [...store.properties.values()].map((p) => ({
      id: p.id,
      state_code: p.stateCode,
      opportunity_score: p.opportunityScore,
      distress_score: p.distressScore,
      equity_pct: p.equityPct,
      estimated_rehab: p.estimatedRehab,
      estimated_arv: p.estimatedArv,
      absentee_owner: p.absenteeOwner,
      is_demo: p.isDemo,
      active_subtypes: [],
    }));
    const ranked = rankAcquisitionMatches(props, { state: "TN", distressScoreMin: 40 });
    expect(ranked[0].rank_reasons.length).toBeGreaterThan(0);
    expect(ranked[0].rank_score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].rank_score);
  });
});

describe("Funding marketplace", () => {
  it("respects lender LTC / ARV / state requirements", () => {
    const lender = DEMO_LENDERS[0];
    const good = scoreFundingMatch(
      {
        state: "TN",
        purchase_price: 185000,
        rehab: 70000,
        arv: 365000,
        loan_request: 230000,
        borrower_credit: 700,
        experience_deals: 2,
      },
      lender,
    );
    expect(good.match_score).toBeGreaterThan(50);
    const badState = scoreFundingMatch(
      {
        state: "CA",
        purchase_price: 185000,
        rehab: 70000,
        arv: 365000,
        loan_request: 230000,
      },
      lender,
    );
    expect(badState.match_score).toBe(0);
  });
});

describe("Construction intelligence", () => {
  it("associates rehab line items to a property estimate", () => {
    const est = buildConstructionEstimate({
      sqft: 1600,
      yearBuilt: 1985,
      estimatedRehab: 68500,
    });
    expect(est.scopeOfWork.length).toBeGreaterThan(10);
    expect(est.grandTotal).toBeGreaterThan(est.materialsTotal);
    expect(est.contingencyAmount).toBeGreaterThan(0);
  });
});

describe("Deal risk intelligence", () => {
  it("keeps provenance on risk signals", () => {
    const risk = assessDealRisk({
      activeSubtypes: ["auction_scheduled", "tax_delinquent"],
      delinquentTaxes: 12870,
      auctionDate: "2026-09-18",
      openPermits: 1,
      ownershipMatched: true,
      isDemo: true,
    });
    expect(risk.overallLevel).toBe("red");
    expect(risk.signals.every((s) => !!s.provenance && !!s.sourceLabel)).toBe(true);
  });
});

describe("Exit strategy engine", () => {
  it("reproduces expected strategy set with editable assumptions", () => {
    const assumptions = defaultAssumptionsFromProperty({
      estimatedValue: 318000,
      estimatedArv: 410000,
      estimatedRehab: 68500,
      openingBid: 210000,
    });
    const { results, recommended, assumptions: shown } = compareExitStrategies(assumptions);
    expect(shown.purchasePrice).toBe(210000);
    expect(results.map((r) => r.strategy)).toContain("fix_and_flip");
    expect(results.map((r) => r.strategy)).toContain("wholesale");
    expect(results.map((r) => r.strategy)).toContain("brrrr");
    expect(recommended.strategy).toBeTruthy();
  });
});

describe("Owner outreach", () => {
  it("enforces opt-out suppression", () => {
    const suppressed = isSuppressed(
      [{ channel: "sms", destination: "+16155550100" }],
      "sms",
      "+16155550100",
    );
    expect(suppressed.suppressed).toBe(true);
    const draft = draftOwnerOutreach({
      ownerName: "John Smith",
      address: "123 Main St",
      channel: "sms",
      mentionDistress: true,
    });
    expect(draft.body.toLowerCase()).not.toContain("foreclosure");
  });

  it("applies calling-hour policy", () => {
    const noon = withinCallingHours(new Date("2026-08-26T17:00:00Z"), -5);
    expect(noon.ok).toBe(true);
    const late = withinCallingHours(new Date("2026-08-27T03:00:00Z"), -5);
    expect(late.ok).toBe(false);
  });
});

describe("Buyer matching", () => {
  it("scores compatibility transparently", () => {
    const m = scoreBuyerMatch(
      {
        state_code: "TN",
        city: "Franklin",
        property_type: "residential",
        opening_bid: 185000,
        estimated_arv: 310000,
        estimated_rehab: 52000,
      },
      DEMO_BUYERS[0],
    );
    expect(m.match_score).toBeGreaterThan(50);
    expect(m.reasons.length).toBeGreaterThan(0);
  });
});

describe("Permit / zoning", () => {
  it("displays source certainty and never overclaims subdivision", () => {
    const z = demoZoningForCounty("47101");
    expect(z.certainty).toBe("demo");
    expect(z.hidden_opportunity_note?.toLowerCase()).toContain("investigation");
    expect(z.subdivision_potential?.toLowerCase()).not.toContain("definitely");
  });
});

describe("Transactions / portfolio", () => {
  it("rolls portfolio metrics without inventing a second property identity", () => {
    const assets = [
      {
        purchase_price: 200000,
        rehab_cost: 50000,
        loan_balance: 150000,
        current_value_est: 320000,
        rent_monthly: 2200,
        vacancy_pct: 5,
        taxes_annual: 2400,
        insurance_annual: 1200,
        maintenance_monthly: 100,
        monthly_payment: 1100,
        status: "owned",
      },
      {
        purchase_price: 180000,
        rehab_cost: 70000,
        loan_balance: 160000,
        current_value_est: 300000,
        rent_monthly: 0,
        status: "rehab",
      },
    ];
    const rollup = rollupPortfolio(assets);
    expect(rollup.propertyCount).toBe(2);
    expect(rollup.equity).toBe(
      portfolioAssetMetrics(assets[0]).equity + portfolioAssetMetrics(assets[1]).equity,
    );
    expect(rollup.rehabs).toBe(1);
  });
});

describe("Opportunity Radar", () => {
  it("flags buy-box matches with reasons", () => {
    const m = scoreRadarMatch(
      {
        state_code: "TN",
        opening_bid: 205000,
        estimated_arv: 395000,
        estimated_rehab: 68000,
        equity_pct: 0.38,
        potential_spread: 76800,
        opportunity_score: 90,
        active_distress: true,
        absentee_owner: true,
        is_demo: true,
      },
      {
        state: "TN",
        acquisitionMax: 300000,
        arvMin: 400000,
        rehabMax: 100000,
        profitMin: 60000,
        equityPctMin: 0.3,
        distressPreferred: true,
        absenteePreferred: true,
      },
    );
    // ARV 395k < 400k min → should fail hard criteria
    expect(m.passes).toBe(false);

    const pass = scoreRadarMatch(
      {
        state_code: "TN",
        opening_bid: 205000,
        estimated_arv: 410000,
        estimated_rehab: 68000,
        equity_pct: 0.38,
        potential_spread: 76800,
        opportunity_score: 90,
        active_distress: true,
        absentee_owner: true,
        is_demo: true,
      },
      {
        state: "TN",
        acquisitionMax: 300000,
        arvMin: 400000,
        rehabMax: 100000,
        profitMin: 60000,
        equityPctMin: 0.3,
        distressPreferred: true,
      },
    );
    expect(pass.passes).toBe(true);
    expect(pass.match_score).toBeGreaterThan(40);
  });
});

describe("Entitlements", () => {
  it("centralizes plan flags instead of hard-coding in UI", () => {
    expect(osEntitlementsForPlan("free").ai_acquisition_agent).toBe(false);
    expect(osEntitlementsForPlan("professional").buyer_matching).toBe(true);
    expect(osEntitlementsForPlan("beginner").opportunity_radar).toBe(true);
  });
});
