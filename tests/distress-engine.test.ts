import { describe, expect, test } from "vitest";
import {
  buildMatchKey,
  matchProperty,
  normalizeAddress,
  normalizeApn,
  resolveFieldConflict,
} from "../src/lib/distress/matching";
import {
  calculateDistressScore,
  calculateOpportunityScore,
  DEFAULT_DISTRESS_WEIGHTS,
} from "../src/lib/distress/scoring";
import {
  ingestRecords,
  createInMemoryStore,
  searchProperties,
} from "../src/lib/distress/ingestion/pipeline";
import { buildDemoRecords } from "../src/lib/distress/providers/demo-data";
import { listProviderHealth, getProviderAdapter } from "../src/lib/distress/providers";
import { entitlementsForPlan } from "../src/lib/distress/entitlements";
import { coverageSummary, findCounty, TEST_MARKET_FIPS } from "../src/lib/distress/geography";
import { buildDistressAiBrief } from "../src/lib/distress/ai";
import {
  ALL_DISTRESS_SUBTYPES,
  canLabelCondemned,
  SUBTYPE_TO_CATEGORY,
} from "../src/lib/distress/taxonomy";
import { navForRole } from "../src/lib/canons";

describe("distress taxonomy", () => {
  test("covers required subtypes across five categories", () => {
    expect(ALL_DISTRESS_SUBTYPES.length).toBeGreaterThanOrEqual(35);
    expect(SUBTYPE_TO_CATEGORY.auction_scheduled).toBe("foreclosure");
    expect(SUBTYPE_TO_CATEGORY.tax_delinquent).toBe("tax");
    expect(SUBTYPE_TO_CATEGORY.condemned).toBe("code");
    expect(SUBTYPE_TO_CATEGORY.vacant).toBe("vacancy");
    expect(SUBTYPE_TO_CATEGORY.hud_reo).toBe("government");
  });

  test("does not allow condemned label without source support", () => {
    expect(canLabelCondemned("condemned", true)).toBe(true);
    expect(canLabelCondemned("condemned", false)).toBe(false);
    expect(canLabelCondemned("vacant", true)).toBe(false);
  });
});

describe("address / APN matching", () => {
  test("normalizes street suffixes and builds stable match keys", () => {
    expect(normalizeAddress("412 Maple Grove Lane")).toBe("412 maple grove ln");
    expect(normalizeAddress("218 East 9th Street")).toBe("218 e 9th st");
    expect(normalizeApn("048A-A-012.00")).toBe("048AA01200");
    const a = buildMatchKey({
      countyFips: "47187",
      apn: "048A-A-012.00",
      address: "412 Maple Grove Lane",
    });
    const b = buildMatchKey({
      countyFips: "47187",
      apn: "048A-A-012.00",
      address: "different",
    });
    expect(a).toBe(b);
  });

  test("matches by APN+FIPS across candidates", () => {
    const result = matchProperty(
      { countyFips: "47187", apn: "048A-A-012.00", address: "412 Maple Grove Lane" },
      [
        {
          id: "p1",
          matchKey: "other",
          countyFips: "47187",
          apn: "048AA01200",
          addressNormalized: "412 maple grove ln",
        },
      ],
    );
    expect(result.kind).toBe("exact");
    if (result.kind !== "none") expect(result.propertyId).toBe("p1");
  });

  test("never overwrites higher-confidence fields with lower", () => {
    const kept = resolveFieldConflict(
      { value: "Authoritative", confidence: 95 },
      { value: "Guess", confidence: 50 },
    );
    expect(kept.replaced).toBe(false);
    expect(kept.value).toBe("Authoritative");
    const upgraded = resolveFieldConflict(
      { value: "Guess", confidence: 50 },
      { value: "Authoritative", confidence: 95 },
    );
    expect(upgraded.replaced).toBe(true);
    expect(upgraded.value).toBe("Authoritative");
  });
});

describe("scoring", () => {
  test("distress score is transparent and capped at 100", () => {
    const score = calculateDistressScore(
      {
        activeSubtypes: [
          "auction_scheduled",
          "tax_delinquent",
          "condemned",
          "vacant",
          "absentee_owner",
        ],
        independentSourceCount: 4,
        taxDelinquentYears: 3,
        estimatedEquity: 148000,
        estimatedValue: 312000,
      },
      DEFAULT_DISTRESS_WEIGHTS,
    );
    expect(score.total).toBeGreaterThan(50);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.signals.some((s) => s.key === "auction_scheduled")).toBe(true);
    expect(score.signals.find((s) => s.key === "auction_scheduled")?.points).toBe(30);
  });

  test("opportunity score is separate from distress", () => {
    const opp = calculateOpportunityScore({
      distressScore: 90,
      estimatedEquity: 148000,
      estimatedValue: 312000,
      estimatedArv: 365000,
      estimatedRehab: 62000,
      openingBid: 175000,
      potentialSpread: 128000,
    });
    expect(opp.total).toBeGreaterThan(0);
    expect(opp.total).toBeLessThanOrEqual(100);
    expect(opp.signals.some((s) => s.key === "distress")).toBe(true);
  });
});

describe("ingestion pipeline", () => {
  test("four independent sources collapse to one property with multiple events", () => {
    const records = buildDemoRecords("47187").filter((r) => r.sourceRecordId.includes("1001"));
    expect(records.length).toBeGreaterThanOrEqual(4);
    const { store, stats } = ingestRecords(records);
    expect(store.properties.size).toBe(1);
    expect(store.sourceRecords.size).toBe(records.length);
    expect(store.events.size).toBe(records.length);
    expect(stats.propertiesCreated).toBe(1);
    expect(stats.propertiesMatched).toBe(records.length - 1);
    const prop = [...store.properties.values()][0];
    expect(prop.distressScore).toBeGreaterThan(50);
    expect(prop.activeDistress).toBe(true);
  });

  test("repeated ingestion is idempotent (no duplicate events)", () => {
    const records = buildDemoRecords("47187");
    const first = ingestRecords(records);
    const second = ingestRecords(records, first.store);
    expect(second.store.properties.size).toBe(first.store.properties.size);
    expect(second.store.events.size).toBe(first.store.events.size);
    expect(second.stats.duplicates).toBe(records.length);
    expect(second.stats.eventsCreated).toBe(0);
  });

  test("search filters by county and subtype", () => {
    const { store } = ingestRecords(buildDemoRecords());
    const franklin = searchProperties(store, {
      countyFips: "47187",
      includeDemo: true,
    });
    expect(franklin.length).toBeGreaterThanOrEqual(1);
    const condemned = searchProperties(store, {
      subtypes: ["condemned"],
      includeDemo: true,
    });
    expect(condemned.some((p) => p.city === "Columbia")).toBe(true);
  });
});

describe("providers", () => {
  test("commercial/federal adapters report NOT CONNECTED without credentials", () => {
    const health = listProviderHealth({});
    const attom = health.find((h) => h.key === "attom");
    expect(attom?.status).toBe("not_connected");
    expect(attom?.missingCredentials).toContain("ATTOM_API_KEY");
    const demo = health.find((h) => h.key === "demo");
    expect(demo?.status).toBe("healthy");
  });

  test("demo adapter returns labeled demo records", async () => {
    const adapter = getProviderAdapter("demo");
    const page = await adapter.fetchPage!({ mode: "full" });
    expect(page.records.every((r) => r.isDemo)).toBe(true);
  });
});

describe("geography", () => {
  test("loads nationwide Census county coverage", () => {
    const summary = coverageSummary();
    expect(summary.totalStates).toBeGreaterThanOrEqual(51);
    expect(summary.totalCounties).toBeGreaterThan(3000);
    for (const fips of TEST_MARKET_FIPS) {
      expect(findCounty(fips)?.state_code).toBe("TN");
    }
  });
});

describe("entitlements + nav + AI claims", () => {
  test("plan entitlements are configurable per tier", () => {
    expect(entitlementsForPlan("free").canUseAiAnalysis).toBe(false);
    expect(entitlementsForPlan("professional").canUseAiAnalysis).toBe(true);
    expect(entitlementsForPlan("free").maxSearchResults).toBeLessThan(
      entitlementsForPlan("team").maxSearchResults,
    );
  });

  test("Distressed Opportunities appears in navigation", () => {
    const nav = navForRole("investor");
    expect(nav.some((n) => n.url === "/distressed-opportunities")).toBe(true);
  });

  test("AI brief distinguishes FACT ESTIMATE INFERENCE", () => {
    const { store } = ingestRecords(buildDemoRecords("47187"));
    const prop = [...store.properties.values()][0];
    const events = [...store.events.values()].filter((e) => e.propertyId === prop.id);
    const brief = buildDistressAiBrief(prop, events, "explain_distress");
    const kinds = new Set(brief.claims.map((c) => c.kind));
    expect(kinds.has("FACT")).toBe(true);
    expect(kinds.has("ESTIMATE") || kinds.has("INFERENCE")).toBe(true);
  });
});

describe("workspace isolation patterns (unit-level)", () => {
  test("in-memory stores do not share property maps", () => {
    const a = createInMemoryStore();
    const b = createInMemoryStore();
    ingestRecords(buildDemoRecords("47101"), a);
    expect(a.properties.size).toBeGreaterThan(0);
    expect(b.properties.size).toBe(0);
  });
});
