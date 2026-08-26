/**
 * Admin server functions for National Distressed Property coverage,
 * source registry, geography seed, and demo ingestion.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getUsCounties,
  getUsStates,
  TEST_MARKET_FIPS,
  coverageSummary,
} from "@/lib/distress/geography";
import { listProviderHealth, getProviderAdapter } from "@/lib/distress/providers";
import { buildDemoRecords } from "@/lib/distress/providers/demo-data";
import { ingestRecords, createInMemoryStore } from "@/lib/distress/ingestion/pipeline";
import { DEFAULT_DISTRESS_WEIGHTS, DEFAULT_OPPORTUNITY_WEIGHTS } from "@/lib/distress/scoring";
import { SOURCE_VERIFICATION_STATUSES } from "@/lib/distress/taxonomy";

type AnyDb = any;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getDistressCoverageDashboardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const geo = coverageSummary();
    const providers = listProviderHealth(process.env);

    const dbMetrics = {
      countiesInDb: 0,
      verifiedForeclosureSources: 0,
      verifiedTaxSources: 0,
      verifiedCodeSources: 0,
      activelyIngesting: 0,
      degradedFeeds: 0,
      countiesWithoutSources: 0,
      propertiesIngestedToday: 0,
      activeDistressed: 0,
      foreclosureCount: 0,
      taxDelinquentCount: 0,
      condemnedCount: 0,
      vacantCount: 0,
      governmentCount: 0,
      duplicatesPrevented: 0,
      ingestionErrors: 0,
      dbAvailable: false,
    };

    try {
      const { count: countyCount } = await db
        .from("geo_counties")
        .select("*", { count: "exact", head: true });
      dbMetrics.countiesInDb = countyCount ?? 0;
      dbMetrics.dbAvailable = true;

      const { data: sources } = await db
        .from("county_data_sources")
        .select("id,source_category,verification_status,sync_status,county_id");

      const src = (sources ?? []) as Array<{
        id: string;
        source_category: string;
        verification_status: string;
        sync_status: string;
        county_id: string;
      }>;
      dbMetrics.verifiedForeclosureSources = src.filter(
        (s: { source_category: string; verification_status: string }) =>
          ["recorder", "clerk_court", "sheriff", "auction"].includes(s.source_category) &&
          ["verified", "active"].includes(s.verification_status),
      ).length;
      dbMetrics.verifiedTaxSources = src.filter(
        (s: { source_category: string; verification_status: string }) =>
          s.source_category === "tax" && ["verified", "active"].includes(s.verification_status),
      ).length;
      dbMetrics.verifiedCodeSources = src.filter(
        (s: { source_category: string; verification_status: string }) =>
          ["code", "building", "condemned"].includes(s.source_category) &&
          ["verified", "active"].includes(s.verification_status),
      ).length;
      dbMetrics.activelyIngesting = src.filter(
        (s: { sync_status: string }) => s.sync_status === "active",
      ).length;
      dbMetrics.degradedFeeds = src.filter((s: { sync_status: string }) =>
        ["degraded", "unavailable", "blocked"].includes(s.sync_status),
      ).length;

      const countiesWithSources = new Set(src.map((s: { county_id: string }) => s.county_id));
      dbMetrics.countiesWithoutSources = Math.max(0, (countyCount ?? 0) - countiesWithSources.size);

      const { count: activeCount } = await db
        .from("canonical_properties")
        .select("*", { count: "exact", head: true })
        .eq("active_distress", true);
      dbMetrics.activeDistressed = activeCount ?? 0;

      const today = new Date().toISOString().slice(0, 10);
      const { count: todayCount } = await db
        .from("canonical_properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00Z`);
      dbMetrics.propertiesIngestedToday = todayCount ?? 0;

      const countSubtype = async (subtype: string) => {
        const { count } = await db
          .from("distress_events")
          .select("*", { count: "exact", head: true })
          .eq("subtype", subtype)
          .in("status", ["active", "scheduled", "postponed"]);
        return count ?? 0;
      };
      dbMetrics.foreclosureCount =
        (await countSubtype("auction_scheduled")) +
        (await countSubtype("notice_of_default")) +
        (await countSubtype("foreclosure_filed")) +
        (await countSubtype("sheriff_sale")) +
        (await countSubtype("trustee_sale")) +
        (await countSubtype("reo"));
      dbMetrics.taxDelinquentCount = await countSubtype("tax_delinquent");
      dbMetrics.condemnedCount = await countSubtype("condemned");
      dbMetrics.vacantCount = await countSubtype("vacant");
      dbMetrics.governmentCount =
        (await countSubtype("land_bank")) +
        (await countSubtype("surplus_property")) +
        (await countSubtype("hud_reo"));

      const { data: runs } = await db
        .from("distress_ingestion_runs")
        .select("duplicates,status")
        .order("started_at", { ascending: false })
        .limit(50);
      dbMetrics.duplicatesPrevented = (
        (runs ?? []) as Array<{ duplicates?: number; status?: string }>
      ).reduce((a: number, r: { duplicates?: number }) => a + (r.duplicates ?? 0), 0);
      dbMetrics.ingestionErrors = (
        (runs ?? []) as Array<{ duplicates?: number; status?: string }>
      ).filter((r: { status?: string }) => r.status === "failed").length;
    } catch {
      // migration not applied — use demo pipeline stats
      const store = createInMemoryStore();
      const { stats } = ingestRecords(buildDemoRecords(), store);
      dbMetrics.activeDistressed = store.properties.size;
      dbMetrics.duplicatesPrevented = 0;
      dbMetrics.propertiesIngestedToday = stats.recordsCreated;
    }

    return {
      geography: geo,
      testMarkets: TEST_MARKET_FIPS,
      providers,
      metrics: dbMetrics,
      verificationStatuses: SOURCE_VERIFICATION_STATUSES,
      defaultWeights: DEFAULT_DISTRESS_WEIGHTS,
      opportunityWeights: DEFAULT_OPPORTUNITY_WEIGHTS,
    };
  });

export const seedNationalGeographyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _admin as AnyDb;

    const states = getUsStates();
    const counties = getUsCounties();

    const { error: countryErr } = await supabaseAdmin
      .from("geo_countries")
      .upsert({ code: "US", name: "United States" });
    if (countryErr) throw new Error(countryErr.message);

    const stateRows = states.map((s) => ({
      country_code: "US",
      fips: s.fips,
      code: s.code,
      name: s.name,
    }));

    // upsert in chunks
    for (let i = 0; i < stateRows.length; i += 100) {
      const chunk = stateRows.slice(i, i + 100);
      const { error } = await supabaseAdmin.from("geo_states").upsert(chunk, {
        onConflict: "country_code,fips",
      });
      if (error) throw new Error(error.message);
    }

    const { data: stateDb } = await supabaseAdmin
      .from("geo_states")
      .select("id,fips,code")
      .eq("country_code", "US");
    const stateIdByFips = new Map(
      (stateDb ?? []).map((s: any) => [s.fips as string, s.id as string]),
    );

    let inserted = 0;
    for (let i = 0; i < counties.length; i += 200) {
      const chunk = counties.slice(i, i + 200).map((c) => ({
        state_id: stateIdByFips.get(c.state_fips),
        state_fips: c.state_fips,
        county_fips: c.county_fips,
        fips: c.fips,
        name: c.name,
        equivalent_type: c.equivalent_type,
        verification_state: "unknown",
        sync_status: "unknown",
      }));
      const valid = chunk.filter((c) => c.state_id);
      const { error } = await supabaseAdmin
        .from("geo_counties")
        .upsert(valid, { onConflict: "fips" });
      if (error) throw new Error(error.message);
      inserted += valid.length;
    }

    return {
      states: states.length,
      countiesInserted: inserted,
      totalCounties: counties.length,
    };
  });

export const seedTestMarketSourcesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _admin as AnyDb;

    const { data: provider } = await supabaseAdmin
      .from("distress_providers")
      .select("id")
      .eq("key", "local_government")
      .maybeSingle();

    const specs = [
      {
        fips: "47187",
        agency: "Williamson County Clerk & Master",
        category: "clerk_court",
        url: "https://williamsoncounty-tn.gov/",
        status: "discovered",
      },
      {
        fips: "47187",
        agency: "Williamson County Trustee",
        category: "tax",
        url: "https://williamsoncounty-tn.gov/",
        status: "discovered",
      },
      {
        fips: "47187",
        agency: "City of Franklin Codes",
        category: "code",
        url: "https://www.franklintn.gov/",
        status: "discovered",
      },
      {
        fips: "47119",
        agency: "Maury County Building Department",
        category: "condemned",
        url: "https://www.maurycounty-tn.gov/",
        status: "discovered",
      },
      {
        fips: "47119",
        agency: "Maury County Trustee",
        category: "tax",
        url: "https://www.maurycounty-tn.gov/",
        status: "discovered",
      },
      {
        fips: "47101",
        agency: "Lewis County Sheriff",
        category: "sheriff",
        url: "https://www.lewiscountytn.com/",
        status: "discovered",
      },
      {
        fips: "47101",
        agency: "Lewis County Land Bank",
        category: "land_bank",
        url: "https://www.lewiscountytn.com/",
        status: "discovered",
      },
    ] as const;

    const created = [];
    for (const spec of specs) {
      const { data: county } = await supabaseAdmin
        .from("geo_counties")
        .select("id")
        .eq("fips", spec.fips)
        .maybeSingle();
      if (!county) continue;
      const { data, error } = await supabaseAdmin
        .from("county_data_sources")
        .insert({
          county_id: county.id,
          provider_id: provider?.id ?? null,
          agency_name: spec.agency,
          source_category: spec.category,
          url: spec.url,
          access_method: "manual",
          verification_status: spec.status,
          sync_status: "manual_only",
          notes:
            "URL present does NOT mean verified. Mark verified only after successful live sync validation.",
          is_demo: true,
        })
        .select("*")
        .single();
      if (!error && data) created.push(data);
    }

    return { created: created.length, sources: created };
  });

export const runDemoIngestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const adapter = getProviderAdapter("demo");
    const page = await adapter.fetchPage!({ mode: "full" });
    const memory = ingestRecords(page.records);

    const persisted = { properties: 0, events: 0, mode: "memory_only" as string };
    try {
      const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
      const supabaseAdmin = _admin as AnyDb;
      const { data: provider } = await supabaseAdmin
        .from("distress_providers")
        .select("id")
        .eq("key", "demo")
        .maybeSingle();

      const { data: run } = await supabaseAdmin
        .from("distress_ingestion_runs")
        .insert({
          provider_id: provider?.id ?? null,
          run_type: "demo",
          status: "running",
          created_by: context.userId,
          records_received: memory.stats.recordsReceived,
        })
        .select("id")
        .single();

      for (const prop of memory.store.properties.values()) {
        const row = {
          county_fips: prop.countyFips,
          state_code: prop.stateCode,
          city: prop.city,
          zip: prop.zip,
          apn: prop.apn,
          address_raw: prop.addressRaw,
          address_normalized: prop.addressNormalized,
          latitude: prop.latitude,
          longitude: prop.longitude,
          property_type: prop.propertyType,
          beds: prop.beds,
          baths: prop.baths,
          sqft: prop.sqft,
          year_built: prop.yearBuilt,
          estimated_value: prop.estimatedValue,
          estimated_arv: prop.estimatedArv,
          estimated_rehab: prop.estimatedRehab,
          estimated_equity: prop.estimatedEquity,
          equity_pct: prop.equityPct,
          opening_bid: prop.openingBid,
          loan_balance: prop.loanBalance,
          delinquent_taxes: prop.delinquentTaxes,
          potential_spread: prop.potentialSpread,
          owner_name: prop.ownerName,
          owner_type: prop.ownerType,
          owner_occupied: prop.ownerOccupied,
          absentee_owner: prop.absenteeOwner,
          occupancy_status: prop.occupancyStatus,
          ownership_duration_months: prop.ownershipDurationMonths,
          match_key: prop.matchKey,
          is_demo: true,
          active_distress: prop.activeDistress,
          distress_score: prop.distressScore,
          opportunity_score: prop.opportunityScore,
          score_version: prop.scoreVersion,
          score_calculated_at: prop.scoreCalculatedAt,
          score_components: prop.scoreComponents ?? {},
          score_signals: prop.scoreSignals ?? [],
        };
        const { data: upserted, error } = await supabaseAdmin
          .from("canonical_properties")
          .upsert(row, { onConflict: "match_key" })
          .select("id,match_key")
          .single();
        if (error) continue;
        persisted.properties++;
        const propertyId = upserted.id;
        for (const event of memory.store.events.values()) {
          if (event.propertyId !== prop.id) continue;
          const { error: eErr } = await supabaseAdmin.from("distress_events").upsert(
            {
              property_id: propertyId,
              provider_id: provider?.id ?? null,
              source_record_id: event.sourceRecordId,
              source_key: event.sourceKey,
              category: event.category,
              subtype: event.subtype,
              status: event.status,
              filing_date: event.filingDate,
              auction_date: event.auctionDate,
              confidence_score: event.confidenceScore,
              source_verification_status: event.sourceVerificationStatus,
              raw_payload: event.rawPayload,
              is_demo: true,
            },
            { onConflict: "source_key" },
          );
          if (!eErr) persisted.events++;
        }
      }

      if (run?.id) {
        await supabaseAdmin
          .from("distress_ingestion_runs")
          .update({
            status: "success",
            finished_at: new Date().toISOString(),
            records_created: memory.stats.recordsCreated,
            records_updated: memory.stats.recordsUpdated,
            records_rejected: memory.stats.recordsRejected,
            duplicates: memory.stats.duplicates,
          })
          .eq("id", run.id);
      }
      persisted.mode = "database";
    } catch {
      persisted.mode = "memory_only";
    }

    return {
      stats: memory.stats,
      propertyCount: memory.store.properties.size,
      eventCount: memory.store.events.size,
      sourceCount: memory.store.sourceRecords.size,
      persisted,
    };
  });

export const listCountySourcesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        state: z.string().optional(),
        countyFips: z.string().optional(),
        category: z.string().optional(),
        verification: z.string().optional(),
        failingOnly: z.boolean().optional(),
        staleOnly: z.boolean().optional(),
        noSourceCounties: z.boolean().optional(),
        manualOnly: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    try {
      let q = db
        .from("county_data_sources")
        .select("*, geo_counties(fips,name,state_fips)")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (data.category) q = q.eq("source_category", data.category);
      if (data.verification) q = q.eq("verification_status", data.verification);
      if (data.manualOnly) q = q.eq("sync_status", "manual_only");
      if (data.failingOnly) q = q.in("sync_status", ["degraded", "unavailable", "blocked"]);
      const { data: rows, error } = await q;
      if (error) throw error;
      let filtered = rows ?? [];
      if (data.countyFips) {
        filtered = filtered.filter((r: any) => r.geo_counties?.fips === data.countyFips);
      }
      return { sources: filtered, mode: "database" as const };
    } catch {
      return {
        sources: [],
        mode: "unavailable" as const,
        message: "county_data_sources not available until migration is applied.",
      };
    }
  });

export const updateCountySourceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        verification_status: z.string().optional(),
        sync_status: z.string().optional(),
        notes: z.string().optional(),
        url: z.string().optional(),
        agency_name: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const { id, ...patch } = data;
    // Never auto-promote to verified merely because URL exists
    if (patch.verification_status === "verified" && !patch.notes) {
      // allow but require explicit admin action (this update IS that action)
    }
    const { data: row, error } = await db
      .from("county_data_sources")
      .update({
        ...patch,
        last_verified_at:
          patch.verification_status === "verified" ? new Date().toISOString() : undefined,
        verification_owner: patch.verification_status === "verified" ? context.userId : undefined,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    try {
      const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
      const supabaseAdmin = _admin as AnyDb;
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_id: context.userId,
        action: "distress_source_update",
        record_type: "county_data_sources",
        record_id: id,
        new_value: patch,
      } as any);
    } catch {
      // audit optional
    }

    return { source: row };
  });

export const updateDistressWeightsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        version: z.string().min(1),
        weights: z.record(z.number()),
        opportunity_weights: z.record(z.number()).optional(),
        activate: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    if (data.activate) {
      await db
        .from("distress_score_weights")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { data: row, error } = await db
      .from("distress_score_weights")
      .upsert({
        version: data.version,
        weights: data.weights,
        opportunity_weights: data.opportunity_weights ?? DEFAULT_OPPORTUNITY_WEIGHTS,
        is_active: data.activate ?? false,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { weights: row };
  });

export const updateDistressEntitlementsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        plan_tier: z.string(),
        max_search_results: z.number().int().positive().optional(),
        can_use_advanced_filters: z.boolean().optional(),
        can_use_map_layers: z.boolean().optional(),
        can_save_searches: z.number().int().nonnegative().optional(),
        can_use_ai_analysis: z.boolean().optional(),
        can_export: z.boolean().optional(),
        can_watchlist: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as AnyDb, context.userId);
    const db = context.supabase as AnyDb;
    const { plan_tier, ...patch } = data;
    const { data: row, error } = await db
      .from("distress_plan_entitlements")
      .update(patch)
      .eq("plan_tier", plan_tier)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { entitlements: row };
  });
