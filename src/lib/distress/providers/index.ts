import type { DistressProviderAdapter, ProviderHealth, SyncOptions } from "./types";
import { missingCredentials, withExponentialBackoff } from "./types";
import type { RawDistressRecord } from "../types";
import { CONFIDENCE_BY_SOURCE_CLASS } from "../taxonomy";

function notConnectedHealth(
  adapter: Pick<DistressProviderAdapter, "credentialEnvKeys" | "key" | "name">,
  env?: NodeJS.ProcessEnv,
): ProviderHealth {
  const missing = missingCredentials(adapter.credentialEnvKeys, env);
  if (missing.length) {
    return {
      status: "not_connected",
      message: `${adapter.name} is not connected. Required: ${missing.join(", ")}.`,
      checkedAt: new Date().toISOString(),
      missingCredentials: missing,
    };
  }
  return {
    status: "configured",
    message: `${adapter.name} credentials present but live API verification has not been run.`,
    checkedAt: new Date().toISOString(),
    missingCredentials: [],
  };
}

function baseAdapter(
  partial: Omit<DistressProviderAdapter, "getHealth" | "withRetry" | "fetchPage" | "parseFile"> &
    Partial<Pick<DistressProviderAdapter, "fetchPage" | "parseFile">>,
): DistressProviderAdapter {
  return {
    ...partial,
    getHealth(env) {
      return notConnectedHealth(this, env);
    },
    withRetry(fn, attempts = 3) {
      return withExponentialBackoff(fn, attempts);
    },
    async fetchPage() {
      const health = this.getHealth();
      throw new Error(health.message);
    },
    async parseFile() {
      throw new Error(`${this.name} file ingestion requires credentials or is not yet verified.`);
    },
  };
}

export const attomAdapter: DistressProviderAdapter = baseAdapter({
  key: "attom",
  name: "ATTOM Data",
  kind: "commercial",
  credentialEnvKeys: ["ATTOM_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.vendor_verified,
});

export const hudAdapter: DistressProviderAdapter = baseAdapter({
  key: "hud",
  name: "HUD REO",
  kind: "federal",
  credentialEnvKeys: ["HUD_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.federal_verified,
});

export const usdaAdapter: DistressProviderAdapter = baseAdapter({
  key: "usda",
  name: "USDA Rural Development",
  kind: "federal",
  credentialEnvKeys: ["USDA_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.federal_verified,
});

export const vaAdapter: DistressProviderAdapter = baseAdapter({
  key: "va",
  name: "VA Loan Guaranty",
  kind: "federal",
  credentialEnvKeys: ["VA_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.federal_verified,
});

export const fannieAdapter: DistressProviderAdapter = baseAdapter({
  key: "fannie_mae",
  name: "Fannie Mae HomePath",
  kind: "federal",
  credentialEnvKeys: ["FANNIE_MAE_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.federal_verified,
});

export const freddieAdapter: DistressProviderAdapter = baseAdapter({
  key: "freddie_mac",
  name: "Freddie Mac HomeSteps",
  kind: "federal",
  credentialEnvKeys: ["FREDDIE_MAC_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.federal_verified,
});

export const localGovernmentAdapter: DistressProviderAdapter = {
  key: "local_government",
  name: "Local Government Adapter",
  kind: "local_government",
  credentialEnvKeys: [],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: true,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.government_download,
  getHealth() {
    return {
      status: "configured",
      message:
        "Local government adapters are configured per county source registry. No global API key required.",
      checkedAt: new Date().toISOString(),
      missingCredentials: [],
    };
  },
  withRetry(fn, attempts = 3) {
    return withExponentialBackoff(fn, attempts);
  },
  async parseFile(content, format) {
    if (format === "json") {
      const parsed = JSON.parse(content) as unknown;
      const rows = Array.isArray(parsed) ? parsed : (parsed as { records?: unknown[] }).records;
      if (!Array.isArray(rows)) throw new Error("JSON file must be an array or { records: [] }");
      return rows.map((row, i) => normalizeLooseRecord(row, "local_government", i));
    }
    if (format === "csv") {
      return parseSimpleCsv(content).map((row, i) =>
        normalizeLooseRecord(row, "local_government", i),
      );
    }
    throw new Error("XML local-government parsing requires a county-specific mapper.");
  },
  async normalizeWebhook(payload) {
    const rows = Array.isArray(payload) ? payload : [payload];
    return rows.map((row, i) => normalizeLooseRecord(row, "local_government", i));
  },
};

export const auctionAdapter: DistressProviderAdapter = baseAdapter({
  key: "auction_platform",
  name: "Auction Platform Adapter",
  kind: "auction",
  credentialEnvKeys: ["AUCTION_PROVIDER_API_KEY"],
  supportsApi: true,
  supportsFile: true,
  supportsWebhook: true,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.auction_verified,
});

export const demoAdapter: DistressProviderAdapter = {
  key: "demo",
  name: "Boliviq Demo / Test Feed",
  kind: "demo",
  credentialEnvKeys: [],
  supportsApi: false,
  supportsFile: true,
  supportsWebhook: false,
  supportsIncremental: true,
  defaultConfidence: CONFIDENCE_BY_SOURCE_CLASS.demo,
  getHealth() {
    return {
      status: "healthy",
      message: "Demo feed is always available. Records are labeled is_demo=true.",
      checkedAt: new Date().toISOString(),
      missingCredentials: [],
    };
  },
  withRetry(fn) {
    return fn();
  },
  async fetchPage(options: SyncOptions) {
    const { buildDemoRecords } = await import("./demo-data");
    const records = buildDemoRecords(options.countyFips);
    return { records, nextCursor: null };
  },
  async parseFile(content, format) {
    if (format !== "json") throw new Error("Demo adapter accepts JSON only");
    const parsed = JSON.parse(content) as RawDistressRecord[];
    return parsed.map((r) => ({ ...r, isDemo: true, providerKey: "demo" }));
  },
};

function normalizeLooseRecord(row: unknown, providerKey: string, index: number): RawDistressRecord {
  const r = (row ?? {}) as Record<string, unknown>;
  const subtype = String(r.subtype ?? r.event_subtype ?? "tax_delinquent");
  return {
    sourceRecordId: String(r.sourceRecordId ?? r.id ?? `${providerKey}-${index}`),
    providerKey,
    countyFips: r.countyFips ? String(r.countyFips) : undefined,
    stateCode: r.stateCode ? String(r.stateCode) : r.state ? String(r.state) : undefined,
    city: r.city ? String(r.city) : undefined,
    zip: r.zip ? String(r.zip) : undefined,
    apn: r.apn ? String(r.apn) : undefined,
    address: r.address ? String(r.address) : undefined,
    latitude: r.latitude != null ? Number(r.latitude) : undefined,
    longitude: r.longitude != null ? Number(r.longitude) : undefined,
    subtype: subtype as RawDistressRecord["subtype"],
    estimatedValue: r.estimatedValue != null ? Number(r.estimatedValue) : undefined,
    openingBid: r.openingBid != null ? Number(r.openingBid) : undefined,
    delinquentTaxes: r.delinquentTaxes != null ? Number(r.delinquentTaxes) : undefined,
    ownerName: r.ownerName ? String(r.ownerName) : undefined,
    auctionDate: r.auctionDate ? String(r.auctionDate) : undefined,
    confidenceScore:
      r.confidenceScore != null
        ? Number(r.confidenceScore)
        : CONFIDENCE_BY_SOURCE_CLASS.government_download,
    verificationStatus: "pending_validation",
    rawPayload: r,
  };
}

function parseSimpleCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

export const PROVIDER_ADAPTERS: Record<string, DistressProviderAdapter> = {
  demo: demoAdapter,
  attom: attomAdapter,
  hud: hudAdapter,
  usda: usdaAdapter,
  va: vaAdapter,
  fannie_mae: fannieAdapter,
  freddie_mac: freddieAdapter,
  local_government: localGovernmentAdapter,
  auction_platform: auctionAdapter,
};

export function getProviderAdapter(key: string): DistressProviderAdapter {
  const adapter = PROVIDER_ADAPTERS[key];
  if (!adapter) throw new Error(`Unknown distress provider: ${key}`);
  return adapter;
}

export function listProviderHealth(env?: NodeJS.ProcessEnv) {
  return Object.values(PROVIDER_ADAPTERS).map((a) => ({
    key: a.key,
    name: a.name,
    kind: a.kind,
    ...a.getHealth(env),
    credentialEnvKeys: a.credentialEnvKeys,
  }));
}
