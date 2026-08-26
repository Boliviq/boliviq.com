/** Address / APN / coordinate matching for canonical property deduplication. */

export type MatchInput = {
  countyFips?: string | null;
  apn?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerName?: string | null;
  legalDescription?: string | null;
};

const STREET_SUFFIXES: Record<string, string> = {
  street: "st",
  str: "st",
  st: "st",
  avenue: "ave",
  ave: "ave",
  boulevard: "blvd",
  blvd: "blvd",
  road: "rd",
  rd: "rd",
  drive: "dr",
  dr: "dr",
  lane: "ln",
  ln: "ln",
  court: "ct",
  ct: "ct",
  place: "pl",
  pl: "pl",
  circle: "cir",
  cir: "cir",
  highway: "hwy",
  hwy: "hwy",
  parkway: "pkwy",
  pkwy: "pkwy",
  terrace: "ter",
  ter: "ter",
  trail: "trl",
  trl: "trl",
  way: "way",
};

const DIRECTIONALS: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
  n: "n",
  s: "s",
  e: "e",
  w: "w",
  ne: "ne",
  nw: "nw",
  se: "se",
  sw: "sw",
};

export function normalizeApn(apn: string | null | undefined): string | null {
  if (!apn) return null;
  const cleaned = apn.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length ? cleaned : null;
}

export function normalizeOwnerName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name
    .toUpperCase()
    .replace(/\b(LLC|L\.L\.C\.|INC|INCORPORATED|LTD|LP|LLP|TRUST|ET\s*AL)\b/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length ? cleaned : null;
}

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  const s = address.toLowerCase().replace(/[#.,]/g, " ").replace(/\s+/g, " ").trim();
  const parts = s.split(" ").map((token) => {
    if (STREET_SUFFIXES[token]) return STREET_SUFFIXES[token];
    if (DIRECTIONALS[token]) return DIRECTIONALS[token];
    return token;
  });
  // drop unit designators for match key (keep separately if needed)
  const filtered = parts.filter(
    (t, i, arr) =>
      !["apt", "apartment", "unit", "ste", "suite", "#"].includes(t) &&
      !(i > 0 && ["apt", "apartment", "unit", "ste", "suite"].includes(arr[i - 1])),
  );
  return filtered.join(" ").trim();
}

export function buildMatchKey(input: MatchInput): string {
  const fips = (input.countyFips ?? "").replace(/\D/g, "").padStart(5, "0");
  const apn = normalizeApn(input.apn);
  if (fips && apn) return `fips:${fips}|apn:${apn}`;

  const addr = normalizeAddress(input.address);
  const city = (input.city ?? "").toLowerCase().trim();
  const state = (input.state ?? "").toUpperCase().trim();
  const zip = (input.zip ?? "").replace(/\D/g, "").slice(0, 5);
  if (fips && addr) return `fips:${fips}|addr:${addr}|${city}|${state}|${zip}`;
  if (addr && state) return `addr:${addr}|${city}|${state}|${zip}`;

  if (
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    const lat = input.latitude.toFixed(5);
    const lng = input.longitude.toFixed(5);
    return `geo:${lat},${lng}|${fips || state}`;
  }

  const owner = normalizeOwnerName(input.ownerName);
  if (owner && fips) return `owner:${owner}|fips:${fips}|${addr || "noaddr"}`;

  // last resort — still deterministic for idempotent demo inserts
  return `fallback:${fips}|${addr}|${city}|${state}|${zip}|${owner ?? ""}`;
}

/** Haversine distance in meters. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type CandidateProperty = {
  id: string;
  matchKey: string;
  countyFips?: string | null;
  apn?: string | null;
  addressNormalized?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerName?: string | null;
};

export type MatchResult =
  | { kind: "exact"; propertyId: string; reason: string }
  | { kind: "probable"; propertyId: string; reason: string; score: number }
  | { kind: "none" };

/**
 * Resolve an incoming record against existing candidates.
 * Prefer APN+FIPS, then normalized address, then tight geo proximity.
 */
export function matchProperty(input: MatchInput, candidates: CandidateProperty[]): MatchResult {
  const key = buildMatchKey(input);
  const exact = candidates.find((c) => c.matchKey === key);
  if (exact) return { kind: "exact", propertyId: exact.id, reason: "match_key" };

  const apn = normalizeApn(input.apn);
  const fips = (input.countyFips ?? "").replace(/\D/g, "");
  if (apn && fips) {
    const byApn = candidates.find(
      (c) => normalizeApn(c.apn) === apn && (c.countyFips ?? "").replace(/\D/g, "") === fips,
    );
    if (byApn) return { kind: "exact", propertyId: byApn.id, reason: "apn_fips" };
  }

  const addr = normalizeAddress(input.address);
  if (addr && fips) {
    const byAddr = candidates.find(
      (c) =>
        (c.addressNormalized ?? "") === addr && (c.countyFips ?? "").replace(/\D/g, "") === fips,
    );
    if (byAddr) return { kind: "exact", propertyId: byAddr.id, reason: "address_fips" };
  }

  if (input.latitude != null && input.longitude != null) {
    let best: { id: string; dist: number } | null = null;
    for (const c of candidates) {
      if (c.latitude == null || c.longitude == null) continue;
      if (fips && c.countyFips && c.countyFips.replace(/\D/g, "") !== fips) continue;
      const dist = distanceMeters(input.latitude, input.longitude, c.latitude, c.longitude);
      if (dist <= 25 && (!best || dist < best.dist)) best = { id: c.id, dist };
    }
    if (best) {
      return {
        kind: "probable",
        propertyId: best.id,
        reason: "geo_proximity",
        score: Math.max(0, 100 - best.dist * 2),
      };
    }
  }

  return { kind: "none" };
}

/** Prefer higher-confidence field values; never overwrite higher with lower. */
export function resolveFieldConflict<T>(
  current: { value: T; confidence: number } | null | undefined,
  incoming: { value: T; confidence: number },
): { value: T; confidence: number; replaced: boolean } {
  if (!current || current.value == null || current.value === "") {
    return { value: incoming.value, confidence: incoming.confidence, replaced: true };
  }
  if (incoming.confidence > current.confidence) {
    return { value: incoming.value, confidence: incoming.confidence, replaced: true };
  }
  return { value: current.value, confidence: current.confidence, replaced: false };
}
