/**
 * Distressed Property Engine — user-facing server functions.
 * Uses authenticated Supabase client (RLS). Falls back to in-memory demo when tables are unavailable.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { entitlementsForPlan } from "@/lib/distress/entitlements";
import { buildDistressAiBrief, type DistressAiRequest } from "@/lib/distress/ai";
import {
  ingestRecords,
  createInMemoryStore,
  searchProperties,
} from "@/lib/distress/ingestion/pipeline";
import { buildDemoRecords } from "@/lib/distress/providers/demo-data";
import { listProviderHealth } from "@/lib/distress/providers";
import { DISTRESS_DISCLAIMER } from "@/lib/distress/types";
import { hasPaidAccess } from "@/lib/subscription-access";

/** New distress tables are typed loosely until supabase gen types are regenerated. */
type AnyDb = any;

const demoStore = createInMemoryStore();
let demoSeeded = false;

function ensureDemoStore() {
  if (!demoSeeded) {
    ingestRecords(buildDemoRecords(), demoStore);
    demoSeeded = true;
  }
  return demoStore;
}

async function resolvePlanTier(supabase: AnyDb, userId: string): Promise<string> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,current_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return "free";
  if (!hasPaidAccess(data)) return "free";
  return (data.plan as string) || "professional";
}

const searchSchema = z.object({
  state: z.string().optional(),
  countyFips: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  subtypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  distressScoreMin: z.number().optional(),
  opportunityScoreMin: z.number().optional(),
  equityPctMin: z.number().optional(),
  absenteeOwner: z.boolean().optional(),
  includeDemo: z.boolean().optional(),
  activeOnly: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const searchDistressedPropertiesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => searchSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    const plan = await resolvePlanTier(db, context.userId);
    const entitlements = entitlementsForPlan(plan);
    const page = data.page ?? 1;
    const pageSize = Math.min(data.pageSize ?? 25, entitlements.maxSearchResults);

    // Prefer DB when available; fall back to in-memory demo pipeline.
    try {
      let q = db
        .from("canonical_properties")
        .select("*", { count: "exact" })
        .order("distress_score", { ascending: false, nullsFirst: false });

      if (data.activeOnly !== false) q = q.eq("active_distress", true);
      if (data.includeDemo === false) q = q.eq("is_demo", false);
      if (data.state) q = q.eq("state_code", data.state);
      if (data.countyFips) q = q.eq("county_fips", data.countyFips);
      if (data.city) q = q.ilike("city", data.city);
      if (data.zip) q = q.eq("zip", data.zip);
      if (data.distressScoreMin != null) q = q.gte("distress_score", data.distressScoreMin);
      if (data.opportunityScoreMin != null)
        q = q.gte("opportunity_score", data.opportunityScoreMin);
      if (data.equityPctMin != null) q = q.gte("equity_pct", data.equityPctMin);
      if (data.absenteeOwner != null) q = q.eq("absentee_owner", data.absenteeOwner);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data: rows, error, count } = await q.range(from, to);
      if (error) throw error;

      if (rows && rows.length > 0) {
        return {
          source: "database" as const,
          entitlements,
          disclaimer: DISTRESS_DISCLAIMER,
          total: count ?? rows.length,
          page,
          pageSize,
          properties: rows,
        };
      }
    } catch {
      // table may not exist yet pre-migration
    }

    const store = ensureDemoStore();
    let results = searchProperties(store, {
      state: data.state,
      countyFips: data.countyFips,
      city: data.city,
      zip: data.zip,
      subtypes: data.subtypes,
      distressScoreMin: data.distressScoreMin,
      opportunityScoreMin: data.opportunityScoreMin,
      equityPctMin: data.equityPctMin,
      absenteeOwner: data.absenteeOwner,
      includeDemo: data.includeDemo ?? true,
      activeOnly: data.activeOnly,
    });

    // If filters excluded demo and nothing left, still show demo with flag
    if (!results.length) {
      results = searchProperties(store, { includeDemo: true, activeOnly: true });
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const slice = results.slice(start, start + pageSize);
    const eventsByProp = new Map<string, string[]>();
    for (const e of store.events.values()) {
      if (!["active", "scheduled", "postponed"].includes(e.status)) continue;
      const arr = eventsByProp.get(e.propertyId) ?? [];
      arr.push(e.subtype);
      eventsByProp.set(e.propertyId, arr);
    }

    return {
      source: "demo_memory" as const,
      entitlements,
      disclaimer: DISTRESS_DISCLAIMER,
      total,
      page,
      pageSize,
      properties: slice.map((p) => ({
        id: p.id,
        address_raw: p.addressRaw,
        address_normalized: p.addressNormalized,
        city: p.city,
        state_code: p.stateCode,
        zip: p.zip,
        county_fips: p.countyFips,
        apn: p.apn,
        latitude: p.latitude,
        longitude: p.longitude,
        property_type: p.propertyType,
        estimated_value: p.estimatedValue,
        estimated_arv: p.estimatedArv,
        estimated_rehab: p.estimatedRehab,
        estimated_equity: p.estimatedEquity,
        equity_pct: p.equityPct,
        opening_bid: p.openingBid,
        loan_balance: p.loanBalance,
        delinquent_taxes: p.delinquentTaxes,
        potential_spread: p.potentialSpread,
        owner_name: p.ownerName,
        owner_type: p.ownerType,
        absentee_owner: p.absenteeOwner,
        owner_occupied: p.ownerOccupied,
        distress_score: p.distressScore,
        opportunity_score: p.opportunityScore,
        score_signals: p.scoreSignals,
        score_components: p.scoreComponents,
        active_distress: p.activeDistress,
        is_demo: p.isDemo,
        active_subtypes: eventsByProp.get(p.id) ?? [],
        auction_date:
          [...store.events.values()].find(
            (e) => e.propertyId === p.id && e.auctionDate && e.status === "scheduled",
          )?.auctionDate ?? null,
      })),
    };
  });

export const getDistressedPropertyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    try {
      const { data: prop, error } = await db
        .from("canonical_properties")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw error;
      if (prop) {
        const { data: events } = await db
          .from("distress_events")
          .select("*")
          .eq("property_id", data.id)
          .order("filing_date", { ascending: true });
        return {
          source: "database" as const,
          propertyJson: JSON.stringify(prop),
          eventsJson: JSON.stringify(events ?? []),
          disclaimer: DISTRESS_DISCLAIMER,
        };
      }
    } catch {
      // fall through
    }

    const store = ensureDemoStore();
    const property = store.properties.get(data.id);
    if (!property) throw new Error("Property not found");
    const events = [...store.events.values()]
      .filter((e) => e.propertyId === data.id)
      .sort((a, b) => String(a.filingDate ?? "").localeCompare(String(b.filingDate ?? "")));
    const propertyOut = {
      id: property.id,
      address_raw: property.addressRaw,
      address_normalized: property.addressNormalized,
      city: property.city,
      state_code: property.stateCode,
      zip: property.zip,
      county_fips: property.countyFips,
      apn: property.apn,
      latitude: property.latitude,
      longitude: property.longitude,
      property_type: property.propertyType,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      year_built: property.yearBuilt,
      estimated_value: property.estimatedValue,
      estimated_arv: property.estimatedArv,
      estimated_rehab: property.estimatedRehab,
      estimated_equity: property.estimatedEquity,
      equity_pct: property.equityPct,
      opening_bid: property.openingBid,
      loan_balance: property.loanBalance,
      delinquent_taxes: property.delinquentTaxes,
      potential_spread: property.potentialSpread,
      owner_name: property.ownerName,
      owner_type: property.ownerType,
      absentee_owner: property.absenteeOwner,
      owner_occupied: property.ownerOccupied,
      occupancy_status: property.occupancyStatus,
      ownership_duration_months: property.ownershipDurationMonths,
      distress_score: property.distressScore,
      opportunity_score: property.opportunityScore,
      score_signals: property.scoreSignals,
      score_components: property.scoreComponents,
      score_version: property.scoreVersion,
      score_calculated_at: property.scoreCalculatedAt,
      active_distress: property.activeDistress,
      is_demo: property.isDemo,
    };
    const eventsOut = events.map((e) => ({
      id: e.id,
      category: e.category,
      subtype: e.subtype,
      status: e.status,
      filing_date: e.filingDate,
      auction_date: e.auctionDate,
      confidence_score: e.confidenceScore,
      source_verification_status: e.sourceVerificationStatus,
      provider_key: e.providerKey,
      source_record_id: e.sourceRecordId,
      raw_payload: e.rawPayload,
      first_seen_at: e.firstSeenAt,
      last_seen_at: e.lastSeenAt,
      is_demo: e.isDemo,
    }));
    return {
      source: "demo_memory" as const,
      propertyJson: JSON.stringify(propertyOut),
      eventsJson: JSON.stringify(eventsOut),
      disclaimer: DISTRESS_DISCLAIMER,
    };
  });

export const saveDistressSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        criteriaJson: z.string().min(2),
        notifyOnNewProperty: z.boolean().optional(),
        notifyOnNewEvent: z.boolean().optional(),
        notifyOnAuctionChange: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    const plan = await resolvePlanTier(db, context.userId);
    const entitlements = entitlementsForPlan(plan);
    const criteria = JSON.parse(data.criteriaJson) as Record<
      string,
      string | number | boolean | null
    >;

    try {
      const { count } = await db
        .from("distress_saved_searches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("is_active", true);
      if ((count ?? 0) >= entitlements.canSaveSearches) {
        throw new Error(`Saved-search limit reached for plan (${entitlements.canSaveSearches}).`);
      }
      const { data: row, error } = await db
        .from("distress_saved_searches")
        .insert({
          user_id: context.userId,
          name: data.name,
          criteria,
          notify_on_new_property: data.notifyOnNewProperty ?? true,
          notify_on_new_event: data.notifyOnNewEvent ?? true,
          notify_on_auction_change: data.notifyOnAuctionChange ?? true,
        })
        .select("id,name,user_id")
        .single();
      if (error) throw error;
      return { savedId: row.id as string, name: row.name as string, mode: "database" as const };
    } catch (e) {
      if (e instanceof Error && e.message.includes("limit")) throw e;
      return {
        savedId: crypto.randomUUID(),
        name: data.name,
        mode: "local_ack" as const,
      };
    }
  });
export const toggleDistressWatchlistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ canonicalPropertyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    try {
      const { data: existing } = await db
        .from("distress_watchlist")
        .select("id")
        .eq("user_id", context.userId)
        .eq("canonical_property_id", data.canonicalPropertyId)
        .maybeSingle();
      if (existing) {
        await db.from("distress_watchlist").delete().eq("id", existing.id);
        return { watching: false };
      }
      const plan = await resolvePlanTier(db, context.userId);
      const entitlements = entitlementsForPlan(plan);
      const { count } = await db
        .from("distress_watchlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", context.userId);
      if ((count ?? 0) >= entitlements.canWatchlist) {
        throw new Error(`Watchlist limit reached (${entitlements.canWatchlist}).`);
      }
      await db.from("distress_watchlist").insert({
        user_id: context.userId,
        canonical_property_id: data.canonicalPropertyId,
      });
      return { watching: true };
    } catch (e) {
      if (e instanceof Error && e.message.includes("limit")) throw e;
      return { watching: true, mode: "local_ack" as const };
    }
  });

export const addDistressedToCrmFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        canonicalPropertyId: z.string().uuid(),
        stage: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    let p: Record<string, unknown> | null = null;
    try {
      const { data: row } = await db
        .from("canonical_properties")
        .select("*")
        .eq("id", data.canonicalPropertyId)
        .maybeSingle();
      if (row) p = row as Record<string, unknown>;
    } catch {
      // ignore
    }
    if (!p) {
      const store = ensureDemoStore();
      const mem = store.properties.get(data.canonicalPropertyId);
      if (!mem) throw new Error("Property not found");
      p = {
        address_raw: mem.addressRaw,
        address_normalized: mem.addressNormalized,
        city: mem.city,
        state_code: mem.stateCode,
        zip: mem.zip,
        property_type: mem.propertyType,
        opening_bid: mem.openingBid,
        estimated_value: mem.estimatedValue,
        estimated_arv: mem.estimatedArv,
        estimated_rehab: mem.estimatedRehab,
        opportunity_score: mem.opportunityScore,
        distress_score: mem.distressScore,
        owner_name: mem.ownerName,
      };
    }

    const address = String(p.address_raw ?? p.address_normalized ?? "Distressed property");
    const stage = data.stage ?? "watching";

    const insertPayload: Record<string, unknown> = {
      user_id: context.userId,
      address,
      city: (p.city as string) ?? null,
      state: (p.state_code as string) ?? null,
      zip: (p.zip as string) ?? null,
      property_type: (p.property_type as string) ?? null,
      list_price: (p.opening_bid as number) ?? (p.estimated_value as number) ?? null,
      arv: (p.estimated_arv as number) ?? null,
      rehab_estimate: (p.estimated_rehab as number) ?? null,
      deal_score: (p.opportunity_score as number) ?? null,
      motivation: "distressed",
      source: "distressed_engine",
      owner_name: (p.owner_name as string) ?? null,
      notes: `Imported from Distressed Opportunities. Distress score ${p.distress_score ?? "—"}. ${DISTRESS_DISCLAIMER}`,
      status: "active",
    };

    // canonical_property_id only after migration
    let property: any;
    let pErr: any;
    ({ data: property, error: pErr } = await db
      .from("properties")
      .insert({ ...insertPayload, canonical_property_id: data.canonicalPropertyId } as any)
      .select("*")
      .single());
    if (pErr && String(pErr.message).includes("canonical_property_id")) {
      ({ data: property, error: pErr } = await db
        .from("properties")
        .insert(insertPayload as any)
        .select("*")
        .single());
    }
    if (pErr) throw new Error(pErr.message);

    let contactId: string | null = null;
    if (p.owner_name) {
      const { data: contact } = await db
        .from("contacts")
        .insert({
          user_id: context.userId,
          name: String(p.owner_name),
          role: "owner",
          notes: "Created from distressed property import",
        } as any)
        .select("id")
        .single();
      contactId = contact?.id ?? null;
    }

    const { data: lead, error: lErr } = await db
      .from("leads")
      .insert({
        user_id: context.userId,
        property_id: property.id,
        contact_id: contactId,
        status: stage,
        source: "distressed_engine",
        notes: `Distress signals imported ${new Date().toISOString()}`,
      } as any)
      .select("*")
      .single();
    if (lErr) {
      // stage may not exist on enum yet — retry with researching/new
      const { data: lead2, error: lErr2 } = await db
        .from("leads")
        .insert({
          user_id: context.userId,
          property_id: property.id,
          contact_id: contactId,
          status: "researching",
          source: "distressed_engine",
          notes: `Distress signals imported ${new Date().toISOString()} (requested stage: ${stage})`,
        } as any)
        .select("*")
        .single();
      if (lErr2) throw new Error(lErr2.message);
      return { property, lead: lead2 };
    }

    return { property, lead };
  });
async function chargeCredits(
  supabase: AnyDb,
  userId: string,
  amount: number,
  label: string,
  idempotencyKey: string,
) {
  const { data: wallet } = await supabase
    .from("credit_wallets")
    .select("id,balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (!wallet) {
    return { charged: false, reason: "no_wallet" as const };
  }
  if (wallet.balance < amount) {
    throw new Error(`Insufficient credits (need ${amount}, have ${wallet.balance}).`);
  }
  const { error: ledErr } = await supabase.from("credit_ledger").insert({
    wallet_id: wallet.id,
    label,
    delta: -amount,
    status: "posted",
    idempotency_key: idempotencyKey,
  });
  if (ledErr) {
    if (String(ledErr.message).includes("duplicate") || ledErr.code === "23505") {
      return { charged: true, reason: "idempotent" as const };
    }
    throw new Error(ledErr.message);
  }
  await supabase
    .from("credit_wallets")
    .update({ balance: wallet.balance - amount })
    .eq("id", wallet.id);
  return { charged: true, reason: "posted" as const };
}

export const runDistressAiFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        canonicalPropertyId: z.string().uuid(),
        request: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as AnyDb;
    const plan = await resolvePlanTier(db, context.userId);
    const entitlements = entitlementsForPlan(plan);
    if (!entitlements.canUseAiAnalysis) {
      throw new Error("AI distress analysis requires a Professional or higher plan.");
    }

    const detail = (await getDistressedPropertyFn({ data: { id: data.canonicalPropertyId } })) as {
      propertyJson: string;
      eventsJson: string;
      source: string;
      disclaimer: string;
    };
    const detailProperty = JSON.parse(detail.propertyJson) as Record<string, any>;
    const detailEvents = JSON.parse(detail.eventsJson) as any[];
    const store = ensureDemoStore();
    const memProp = store.properties.get(data.canonicalPropertyId);
    const memEvents = [...store.events.values()].filter(
      (e) => e.propertyId === data.canonicalPropertyId,
    );

    // Normalize DB or memory into AI shapes
    const property =
      memProp ??
      ({
        id: data.canonicalPropertyId,
        matchKey: "",
        addressNormalized: String(detailProperty.address_normalized ?? ""),
        addressRaw: detailProperty.address_raw,
        city: detailProperty.city,
        stateCode: detailProperty.state_code,
        zip: detailProperty.zip,
        isDemo: !!detailProperty.is_demo,
        activeDistress: true,
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        distressScore: detailProperty.distress_score,
        opportunityScore: detailProperty.opportunity_score,
        estimatedValue: detailProperty.estimated_value,
        estimatedArv: detailProperty.estimated_arv,
        estimatedRehab: detailProperty.estimated_rehab,
        loanBalance: detailProperty.loan_balance,
        delinquentTaxes: detailProperty.delinquent_taxes,
        openingBid: detailProperty.opening_bid,
        ownerName: detailProperty.owner_name,
        absenteeOwner: detailProperty.absentee_owner,
        scoreVersion: detailProperty.score_version,
      } as any);

    const events =
      memEvents.length > 0
        ? memEvents
        : detailEvents.map((e) => ({
            id: e.id,
            propertyId: data.canonicalPropertyId,
            sourceKey: e.id,
            providerKey: e.provider_key ?? "unknown",
            sourceRecordId: e.source_record_id ?? e.id,
            category: e.category,
            subtype: e.subtype,
            status: e.status,
            filingDate: e.filing_date,
            auctionDate: e.auction_date,
            confidenceScore: e.confidence_score ?? 50,
            sourceVerificationStatus: e.source_verification_status ?? "unknown",
            isDemo: !!e.is_demo,
            rawPayload: e.raw_payload ?? {},
            firstSeenAt: e.first_seen_at ?? new Date().toISOString(),
            lastSeenAt: e.last_seen_at ?? new Date().toISOString(),
          }));

    const brief = buildDistressAiBrief(property, events, data.request as DistressAiRequest);

    const charge = await chargeCredits(
      db,
      context.userId,
      entitlements.creditsAiAnalysis,
      `distress_ai:${data.request}`,
      `distress-ai:${context.userId}:${data.canonicalPropertyId}:${data.request}:${new Date().toISOString().slice(0, 13)}`,
    );

    return { ...brief, credits: charge, plan };
  });

export const listDistressProviderStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { providers: listProviderHealth(process.env), disclaimer: DISTRESS_DISCLAIMER };
  });
