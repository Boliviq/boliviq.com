/**
 * In-memory ingestion pipeline:
 * RAW → VALIDATE → NORMALIZE → GEOCODE/MATCH → DEDUPE → PROPERTY → EVENT → SCORE
 *
 * Used by unit tests and by server functions (which persist results to Supabase).
 */

import { randomUUID } from "node:crypto";
import {
  buildMatchKey,
  matchProperty,
  normalizeAddress,
  normalizeApn,
  resolveFieldConflict,
  type CandidateProperty,
} from "../matching";
import {
  calculateDistressScore,
  calculateOpportunityScore,
  DEFAULT_DISTRESS_WEIGHTS,
  DEFAULT_OPPORTUNITY_WEIGHTS,
} from "../scoring";
import { SUBTYPE_TO_CATEGORY, type DistressSubtype } from "../taxonomy";
import type {
  CanonicalPropertyRecord,
  DistressEventRecord,
  IngestionStats,
  RawDistressRecord,
  SourceRecord,
} from "../types";

export type InMemoryStore = {
  properties: Map<string, CanonicalPropertyRecord>;
  events: Map<string, DistressEventRecord>;
  sourceRecords: Map<string, SourceRecord>;
};

export function createInMemoryStore(): InMemoryStore {
  return {
    properties: new Map(),
    events: new Map(),
    sourceRecords: new Map(),
  };
}

function deterministicSourceKey(record: RawDistressRecord): string {
  return [
    record.providerKey,
    record.sourceRecordId,
    record.subtype,
    record.countyFips ?? "",
    normalizeApn(record.apn) ?? normalizeAddress(record.address),
  ].join("|");
}

function validateRaw(record: RawDistressRecord): string | null {
  if (!record.sourceRecordId?.trim()) return "missing sourceRecordId";
  if (!record.providerKey?.trim()) return "missing providerKey";
  if (!record.subtype) return "missing subtype";
  if (!SUBTYPE_TO_CATEGORY[record.subtype as DistressSubtype]) {
    return `unknown subtype: ${record.subtype}`;
  }
  if (!record.address && !record.apn && (record.latitude == null || record.longitude == null)) {
    return "insufficient identity (need address, APN, or coordinates)";
  }
  // Never allow condemned without supporting subtype (already subtype-gated)
  return null;
}

function applyPropertyFields(
  prop: CanonicalPropertyRecord,
  record: RawDistressRecord,
): CanonicalPropertyRecord {
  const conf = record.confidenceScore ?? 50;
  const fc = { ...(prop.fieldConfidence ?? {}) };

  const set = <K extends keyof CanonicalPropertyRecord>(
    key: K,
    incoming: CanonicalPropertyRecord[K] | undefined | null,
    field = String(key),
  ) => {
    if (incoming == null || incoming === "") return;
    const currentConf = fc[field] ?? 0;
    const resolved = resolveFieldConflict(
      { value: prop[key], confidence: currentConf },
      { value: incoming, confidence: conf },
    );
    if (resolved.replaced) {
      (prop as Record<string, unknown>)[key as string] = resolved.value;
      fc[field] = resolved.confidence;
    }
  };

  set("countyFips", record.countyFips);
  set("stateCode", record.stateCode);
  set("city", record.city);
  set("zip", record.zip);
  set("apn", normalizeApn(record.apn));
  set("addressRaw", record.address);
  if (record.address) {
    const norm = normalizeAddress(record.address);
    set("addressNormalized", norm);
  }
  set("latitude", record.latitude);
  set("longitude", record.longitude);
  set("propertyType", record.propertyType);
  set("beds", record.beds);
  set("baths", record.baths);
  set("sqft", record.sqft);
  set("yearBuilt", record.yearBuilt);
  set("estimatedValue", record.estimatedValue);
  set("estimatedArv", record.estimatedArv);
  set("estimatedRehab", record.estimatedRehab);
  set("openingBid", record.openingBid);
  set("loanBalance", record.loanBalance);
  set("delinquentTaxes", record.delinquentTaxes);
  set("ownerName", record.ownerName);
  set("ownerType", record.ownerType);
  set("ownerOccupied", record.ownerOccupied);
  set("absenteeOwner", record.absenteeOwner);
  set("occupancyStatus", record.occupancyStatus);
  set("ownershipDurationMonths", record.ownershipDurationMonths);

  const value = prop.estimatedValue ?? prop.estimatedArv ?? 0;
  const debt = (prop.loanBalance ?? 0) + (prop.delinquentTaxes ?? 0) + (prop.estimatedLiens ?? 0);
  if (value > 0) {
    prop.estimatedEquity = Math.max(0, value - debt);
    prop.equityPct = prop.estimatedEquity / value;
  }
  if (prop.estimatedArv != null) {
    const costs =
      (prop.openingBid ?? prop.loanBalance ?? 0) +
      (prop.estimatedRehab ?? 0) +
      (prop.delinquentTaxes ?? 0);
    prop.potentialSpread = prop.estimatedArv - costs;
  }

  prop.fieldConfidence = fc;
  prop.lastSeenAt = new Date().toISOString();
  if (record.isDemo) prop.isDemo = true;
  return prop;
}

function rescoreProperty(store: InMemoryStore, propertyId: string) {
  const prop = store.properties.get(propertyId);
  if (!prop) return;
  const events = [...store.events.values()].filter(
    (e) => e.propertyId === propertyId && ["active", "scheduled", "postponed"].includes(e.status),
  );
  const sources = new Set(events.map((e) => e.providerKey));
  const taxYears = Math.max(
    0,
    ...events
      .filter((e) => e.subtype === "tax_delinquent")
      .map((e) =>
        Number((e.rawPayload as { taxDelinquentYears?: number }).taxDelinquentYears ?? 1),
      ),
  );
  const codeCount = events.filter((e) => e.category === "code").length;

  const distress = calculateDistressScore(
    {
      activeSubtypes: events.map((e) => e.subtype),
      independentSourceCount: sources.size,
      taxDelinquentYears: taxYears,
      repeatedViolations: codeCount,
      estimatedEquity: prop.estimatedEquity,
      estimatedValue: prop.estimatedValue,
      governmentOwned: ["government", "land_bank"].includes(prop.ownerType ?? ""),
    },
    DEFAULT_DISTRESS_WEIGHTS,
  );

  const firstSeen = new Date(prop.firstSeenAt).getTime();
  const daysInDistress = Math.max(0, Math.round((Date.now() - firstSeen) / 86400000));

  const opportunity = calculateOpportunityScore(
    {
      distressScore: distress.total,
      estimatedEquity: prop.estimatedEquity,
      estimatedValue: prop.estimatedValue,
      estimatedArv: prop.estimatedArv,
      estimatedRehab: prop.estimatedRehab,
      openingBid: prop.openingBid,
      loanBalance: prop.loanBalance,
      delinquentTaxes: prop.delinquentTaxes,
      potentialSpread: prop.potentialSpread,
      monthlyRentEst: prop.monthlyRentEst,
      daysInDistress,
      ownershipDurationMonths: prop.ownershipDurationMonths,
    },
    DEFAULT_OPPORTUNITY_WEIGHTS,
  );

  prop.distressScore = distress.total;
  prop.opportunityScore = opportunity.total;
  prop.scoreVersion = distress.version;
  prop.scoreCalculatedAt = distress.calculatedAt;
  prop.scoreComponents = { ...distress.components, ...opportunity.components };
  prop.scoreSignals = distress.signals;
  prop.activeDistress = events.length > 0;
  store.properties.set(propertyId, prop);
}

export function ingestRecords(
  records: RawDistressRecord[],
  store: InMemoryStore = createInMemoryStore(),
): { store: InMemoryStore; stats: IngestionStats } {
  const stats: IngestionStats = {
    recordsReceived: records.length,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsRejected: 0,
    duplicates: 0,
    propertiesCreated: 0,
    propertiesMatched: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    parsingErrors: 0,
  };

  for (const raw of records) {
    const err = validateRaw(raw);
    if (err) {
      stats.recordsRejected++;
      stats.parsingErrors++;
      continue;
    }

    const sourceKey = deterministicSourceKey(raw);
    const existingSource = store.sourceRecords.get(sourceKey);
    if (existingSource) {
      stats.duplicates++;
      stats.recordsUpdated++;
      existingSource.rawPayload = raw.rawPayload ?? existingSource.rawPayload;
      store.sourceRecords.set(sourceKey, existingSource);
    } else {
      const src: SourceRecord = {
        id: randomUUID(),
        sourceKey,
        providerKey: raw.providerKey,
        sourceRecordId: raw.sourceRecordId,
        confidenceScore: raw.confidenceScore ?? 50,
        rawPayload: raw.rawPayload ?? {},
        isDemo: !!raw.isDemo,
      };
      store.sourceRecords.set(sourceKey, src);
      stats.recordsCreated++;
    }

    const candidates: CandidateProperty[] = [...store.properties.values()].map((p) => ({
      id: p.id,
      matchKey: p.matchKey,
      countyFips: p.countyFips,
      apn: p.apn,
      addressNormalized: p.addressNormalized,
      latitude: p.latitude,
      longitude: p.longitude,
      ownerName: p.ownerName,
    }));

    const matchInput = {
      countyFips: raw.countyFips,
      apn: raw.apn,
      address: raw.address,
      city: raw.city,
      state: raw.stateCode,
      zip: raw.zip,
      latitude: raw.latitude,
      longitude: raw.longitude,
      ownerName: raw.ownerName,
    };
    const match = matchProperty(matchInput, candidates);
    let propertyId: string;

    if (match.kind === "exact" || match.kind === "probable") {
      propertyId = match.propertyId;
      stats.propertiesMatched++;
      const prop = store.properties.get(propertyId)!;
      applyPropertyFields(prop, raw);
      store.properties.set(propertyId, prop);
    } else {
      propertyId = randomUUID();
      const now = new Date().toISOString();
      const prop: CanonicalPropertyRecord = {
        id: propertyId,
        matchKey: buildMatchKey(matchInput),
        addressNormalized: normalizeAddress(raw.address) || buildMatchKey(matchInput),
        isDemo: !!raw.isDemo,
        activeDistress: true,
        firstSeenAt: now,
        lastSeenAt: now,
        fieldConfidence: {},
      };
      applyPropertyFields(prop, raw);
      store.properties.set(propertyId, prop);
      stats.propertiesCreated++;
    }

    const src = store.sourceRecords.get(sourceKey)!;
    src.propertyId = propertyId;

    const eventKey = sourceKey;
    const existingEvent = store.events.get(eventKey);
    const category = SUBTYPE_TO_CATEGORY[raw.subtype as DistressSubtype];
    if (existingEvent) {
      existingEvent.lastSeenAt = new Date().toISOString();
      existingEvent.status = raw.status ?? existingEvent.status;
      existingEvent.auctionDate = raw.auctionDate ?? existingEvent.auctionDate;
      existingEvent.rawPayload = raw.rawPayload ?? existingEvent.rawPayload;
      store.events.set(eventKey, existingEvent);
      stats.eventsUpdated++;
    } else {
      const event: DistressEventRecord = {
        id: randomUUID(),
        propertyId,
        sourceKey: eventKey,
        providerKey: raw.providerKey,
        sourceRecordId: raw.sourceRecordId,
        category,
        subtype: raw.subtype,
        status: raw.status ?? "active",
        filingDate: raw.filingDate ?? null,
        auctionDate: raw.auctionDate ?? null,
        confidenceScore: raw.confidenceScore ?? 50,
        sourceVerificationStatus: raw.verificationStatus ?? "unknown",
        isDemo: !!raw.isDemo,
        rawPayload: {
          ...(raw.rawPayload ?? {}),
          taxDelinquentYears: raw.taxDelinquentYears,
          condemnationReason: raw.condemnationReason,
          violationDescription: raw.violationDescription,
          codeCaseNumber: raw.codeCaseNumber,
        },
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };
      store.events.set(eventKey, event);
      stats.eventsCreated++;
    }

    rescoreProperty(store, propertyId);
  }

  return { store, stats };
}

export function searchProperties(
  store: InMemoryStore,
  filters: {
    state?: string;
    countyFips?: string;
    city?: string;
    zip?: string;
    subtypes?: string[];
    distressScoreMin?: number;
    opportunityScoreMin?: number;
    includeDemo?: boolean;
    activeOnly?: boolean;
    equityPctMin?: number;
    absenteeOwner?: boolean;
  } = {},
): CanonicalPropertyRecord[] {
  let rows = [...store.properties.values()];
  if (filters.activeOnly !== false) rows = rows.filter((p) => p.activeDistress);
  if (!filters.includeDemo) rows = rows.filter((p) => !p.isDemo);
  if (filters.state) rows = rows.filter((p) => p.stateCode === filters.state);
  if (filters.countyFips) rows = rows.filter((p) => p.countyFips === filters.countyFips);
  if (filters.city) {
    const c = filters.city.toLowerCase();
    rows = rows.filter((p) => (p.city ?? "").toLowerCase() === c);
  }
  if (filters.zip) rows = rows.filter((p) => p.zip === filters.zip);
  if (filters.distressScoreMin != null) {
    rows = rows.filter((p) => (p.distressScore ?? 0) >= filters.distressScoreMin!);
  }
  if (filters.opportunityScoreMin != null) {
    rows = rows.filter((p) => (p.opportunityScore ?? 0) >= filters.opportunityScoreMin!);
  }
  if (filters.equityPctMin != null) {
    rows = rows.filter((p) => (p.equityPct ?? 0) >= filters.equityPctMin!);
  }
  if (filters.absenteeOwner != null) {
    rows = rows.filter((p) => !!p.absenteeOwner === filters.absenteeOwner);
  }
  if (filters.subtypes?.length) {
    const wanted = new Set(filters.subtypes);
    rows = rows.filter((p) =>
      [...store.events.values()].some(
        (e) => e.propertyId === p.id && wanted.has(e.subtype) && e.status !== "resolved",
      ),
    );
  }
  return rows.sort((a, b) => (b.distressScore ?? 0) - (a.distressScore ?? 0));
}
