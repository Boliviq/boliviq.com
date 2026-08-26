/**
 * Investor Operating System server functions.
 * Reuses distress catalog, CRM, credits, and deal-calc — demo-backed when DB unavailable.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasPaidAccess } from "@/lib/subscription-access";
import { osEntitlementsForPlan, OS_DISCLAIMERS } from "@/lib/investor-os/entitlements";
import {
  compareExitStrategies,
  defaultAssumptionsFromProperty,
} from "@/lib/investor-os/exit-engine";
import { assessDealRisk } from "@/lib/investor-os/risk-engine";
import { buildConstructionEstimate, demoContractorBids } from "@/lib/investor-os/construction";
import { demoZoningForCounty, demoPermits } from "@/lib/investor-os/zoning";
import {
  parseAcquisitionPrompt,
  rankAcquisitionMatches,
} from "@/lib/investor-os/acquisition-agent";
import {
  DEMO_BUYERS,
  DEMO_LENDERS,
  scoreBuyerMatch,
  scoreFundingMatch,
} from "@/lib/investor-os/matching";
import { draftOwnerOutreach, isSuppressed, withinCallingHours } from "@/lib/investor-os/outreach";
import { portfolioAssetMetrics, rollupPortfolio } from "@/lib/investor-os/portfolio";
import { scoreRadarMatch } from "@/lib/investor-os/radar";
import { ensureDemoStore } from "@/lib/distress/demo-store";
import { DISTRESS_DISCLAIMER } from "@/lib/distress/types";
import { SUBTYPE_LABELS } from "@/lib/distress/taxonomy";

type AnyDb = any;

function ensureDemo() {
  return ensureDemoStore();
}

async function resolvePlan(supabase: AnyDb, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,current_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !hasPaidAccess(data)) return "free";
  return (data.plan as string) || "professional";
}

function propertyFromDemo(id: string) {
  const store = ensureDemo();
  const p = store.properties.get(id);
  if (!p) return null;
  const events = [...store.events.values()].filter((e) => e.propertyId === id);
  return {
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
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    year_built: p.yearBuilt,
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
    occupancy_status: p.occupancyStatus,
    ownership_duration_months: p.ownershipDurationMonths,
    distress_score: p.distressScore,
    opportunity_score: p.opportunityScore,
    score_signals: p.scoreSignals,
    active_distress: p.activeDistress,
    is_demo: p.isDemo,
    active_subtypes: events
      .filter((e) => ["active", "scheduled", "postponed"].includes(e.status))
      .map((e) => e.subtype),
    auction_date: events.find((e) => e.auctionDate)?.auctionDate ?? null,
    events: events.map((e) => ({
      id: e.id,
      subtype: e.subtype,
      category: e.category,
      status: e.status,
      filing_date: e.filingDate,
      auction_date: e.auctionDate,
      confidence_score: e.confidenceScore,
      provider_key: e.providerKey,
      first_seen_at: e.firstSeenAt,
    })),
  };
}

function listDemoProperties() {
  const store = ensureDemo();
  return [...store.properties.values()].map((p) => {
    const events = [...store.events.values()].filter((e) => e.propertyId === p.id);
    return {
      id: p.id,
      address_raw: p.addressRaw,
      address_normalized: p.addressNormalized,
      city: p.city,
      state_code: p.stateCode,
      zip: p.zip,
      county_fips: p.countyFips,
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
      absentee_owner: p.absenteeOwner,
      distress_score: p.distressScore,
      opportunity_score: p.opportunityScore,
      active_distress: p.activeDistress,
      is_demo: p.isDemo,
      latitude: p.latitude,
      longitude: p.longitude,
      active_subtypes: events
        .filter((e) => ["active", "scheduled", "postponed"].includes(e.status))
        .map((e) => e.subtype),
      auction_date: events.find((e) => e.auctionDate)?.auctionDate ?? null,
    };
  });
}

export const getOsEntitlementsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    return { plan, entitlements: osEntitlementsForPlan(plan), disclaimers: OS_DISCLAIMERS };
  });

export const getPropertyPassportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const entitlements = osEntitlementsForPlan(plan);

    let property = propertyFromDemo(data.id);
    try {
      const db = context.supabase as AnyDb;
      const { data: row } = await db
        .from("canonical_properties")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (row) {
        const { data: events } = await db
          .from("distress_events")
          .select("*")
          .eq("property_id", data.id);
        property = {
          ...row,
          active_subtypes: (events ?? [])
            .filter((e: any) => ["active", "scheduled", "postponed"].includes(e.status))
            .map((e: any) => e.subtype),
          events: events ?? [],
          auction_date: (events ?? []).find((e: any) => e.auction_date)?.auction_date ?? null,
        } as any;
      }
    } catch {
      // demo fallback
    }
    if (!property) throw new Error("Property not found");

    const risk = assessDealRisk({
      activeSubtypes: property.active_subtypes,
      delinquentTaxes: property.delinquent_taxes,
      auctionDate: property.auction_date,
      openPermits: 1,
      ownershipMatched: true,
      isDemo: !!property.is_demo,
    });

    const assumptions = defaultAssumptionsFromProperty({
      estimatedValue: property.estimated_value,
      estimatedArv: property.estimated_arv,
      estimatedRehab: property.estimated_rehab,
      openingBid: property.opening_bid,
      loanBalance: property.loan_balance,
    });
    const exits = compareExitStrategies(assumptions);
    const construction = buildConstructionEstimate({
      sqft: property.sqft,
      yearBuilt: property.year_built,
      propertyType: property.property_type,
      estimatedRehab: property.estimated_rehab,
    });
    const zoning = demoZoningForCounty(property.county_fips);
    const permits = demoPermits();

    const timeline = [
      ...(property.events ?? []).map((e: any) => ({
        event_at: e.filing_date ?? e.first_seen_at,
        kind: "distress",
        title: SUBTYPE_LABELS[e.subtype as keyof typeof SUBTYPE_LABELS] ?? e.subtype,
        provenance: property.is_demo ? "demo" : "provider_data",
        source_label: e.provider_key ?? "distress",
      })),
      {
        event_at: new Date().toISOString(),
        kind: "system",
        title: "Property Passport opened",
        provenance: "user_provided",
        source_label: "Boliviq",
      },
    ].sort((a, b) => String(a.event_at).localeCompare(String(b.event_at)));

    const fieldProvenance = [
      {
        field_name: "estimated_value",
        field_value: String(property.estimated_value ?? ""),
        classification: "estimate",
        source_label: "Boliviq valuation model",
      },
      {
        field_name: "delinquent_taxes",
        field_value: String(property.delinquent_taxes ?? ""),
        classification: property.is_demo ? "demo" : "provider_data",
        source_label: property.is_demo ? "DEMO tax source" : "Tax source",
      },
      {
        field_name: "distress_score",
        field_value: String(property.distress_score ?? ""),
        classification: "estimate",
        source_label: "Boliviq Distress Score v1",
      },
    ];

    return {
      entitlements,
      disclaimer: DISTRESS_DISCLAIMER,
      property,
      risk,
      exits: {
        assumptions: exits.assumptions,
        results: exits.results,
        recommended: exits.recommended,
      },
      construction,
      bids: demoContractorBids(construction.grandTotal),
      zoning,
      permits,
      timeline,
      fieldProvenance,
      disclaimers: OS_DISCLAIMERS,
    };
  });

export const runAcquisitionAgentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ prompt: z.string().min(8).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const entitlements = osEntitlementsForPlan(plan);
    const demoOnly = !entitlements.ai_acquisition_agent;
    const parsed = parseAcquisitionPrompt(data.prompt);
    const ranked = rankAcquisitionMatches(listDemoProperties(), parsed.filters as any).slice(0, 25);

    try {
      if (!demoOnly) {
        const db = context.supabase as AnyDb;
        await db.from("ai_agent_runs").insert({
          user_id: context.userId,
          agent_key: "acquisition",
          prompt: data.prompt,
          parsed_filters: parsed.filters,
          result_summary: { count: ranked.length, topId: ranked[0]?.id },
          credits_charged: 10,
          is_demo: true,
        });
        const { data: wallet } = await db
          .from("credit_wallets")
          .select("id,balance")
          .eq("user_id", context.userId)
          .maybeSingle();
        if (wallet && wallet.balance >= 10) {
          await db.from("credit_ledger").insert({
            wallet_id: wallet.id,
            label: "ai_acquisition_agent",
            delta: -10,
            status: "posted",
            idempotency_key: `acq:${context.userId}:${Date.now().toString().slice(0, -4)}`,
          });
          await db
            .from("credit_wallets")
            .update({ balance: wallet.balance - 10 })
            .eq("id", wallet.id);
        }
      }
    } catch {
      // offline / pre-migration
    }

    return {
      interpretation: parsed.interpretation,
      filters: parsed.filters,
      matches: ranked,
      claimKindsNote:
        "Rankings are INFERENCE over FACT/ESTIMATE property fields. DEMO rows are labeled.",
      creditsChargedHint: demoOnly ? 0 : 10,
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO exploration only. Professional plan unlocks live AI Acquisition Agent + credit charges."
        : null,
    };
  });

export const runOpportunityRadarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().optional(),
        criteriaJson: z.string(),
        alertDigest: z.enum(["instant", "daily", "weekly", "none"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const entitlements = osEntitlementsForPlan(plan);
    const demoOnly = !entitlements.opportunity_radar;
    const criteria = JSON.parse(data.criteriaJson);
    const matches = listDemoProperties()
      .map((p) => {
        const m = scoreRadarMatch(p, criteria);
        return { ...p, ...m };
      })
      .filter((m) => m.passes)
      .sort((a, b) => b.match_score - a.match_score);

    try {
      const db = context.supabase as AnyDb;
      const { data: box } = await db
        .from("investor_buy_boxes")
        .insert({
          user_id: context.userId,
          name: data.name || "Radar buy box",
          criteria,
          alert_digest: data.alertDigest ?? "daily",
        })
        .select("id")
        .single();
      if (box?.id) {
        for (const m of matches.slice(0, 50)) {
          await db.from("radar_matches").upsert({
            buy_box_id: box.id,
            canonical_property_id: m.id,
            opportunity_score: m.opportunity_score,
            match_score: m.match_score,
            reasons: m.reasons,
          });
        }
      }
    } catch {
      // demo-only persistence
    }

    return {
      matches,
      criteria,
      alertDigest: data.alertDigest ?? "daily",
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO buy-box matching only. Beginner+ unlocks live Opportunity Radar alerts."
        : null,
    };
  });

export const matchFundingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        canonicalPropertyId: z.string().optional(),
        purchasePrice: z.number(),
        rehab: z.number(),
        arv: z.number(),
        loanRequest: z.number(),
        exitStrategy: z.string().optional(),
        state: z.string().optional(),
        experienceDeals: z.number().optional(),
        borrowerCredit: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const demoOnly = !osEntitlementsForPlan(plan).funding_marketplace;
    const pkg = {
      state: data.state,
      purchase_price: data.purchasePrice,
      rehab: data.rehab,
      arv: data.arv,
      loan_request: data.loanRequest,
      exit_strategy: data.exitStrategy,
      experience_deals: data.experienceDeals ?? null,
      borrower_credit: data.borrowerCredit ?? null,
    };
    const matches = DEMO_LENDERS.map((l) => ({
      lender: l,
      ...scoreFundingMatch(pkg, l),
    }))
      .filter((m) => m.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score);

    return {
      package: pkg,
      matches,
      disclaimer: OS_DISCLAIMERS.funding,
      is_demo: true,
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO lender profiles only. Beginner+ unlocks live capital marketplace matching."
        : null,
    };
  });

export const matchBuyersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ canonicalPropertyId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const demoOnly = !osEntitlementsForPlan(plan).buyer_matching;
    const property = propertyFromDemo(data.canonicalPropertyId);
    if (!property) throw new Error("Property not found");
    const matches = DEMO_BUYERS.map((b) => ({
      buyer: b,
      ...scoreBuyerMatch(property, b),
    })).sort((a, b) => b.match_score - a.match_score);
    return {
      property,
      matches,
      privacyNote:
        "Buyer details are DEMO profiles; live matching respects marketplace permissions.",
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO buyer profiles only. Professional unlocks live buyer matching."
        : null,
    };
  });

export const draftOutreachFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        canonicalPropertyId: z.string(),
        channel: z.enum(["phone", "ai_call", "sms", "email", "direct_mail", "postcard"]),
        destination: z.string().optional(),
        mentionDistress: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const demoOnly = !osEntitlementsForPlan(plan).owner_outreach;
    const property = propertyFromDemo(data.canonicalPropertyId);
    if (!property) throw new Error("Property not found");
    const destination = data.destination || "unknown@example.com";
    const suppressions: Array<{ channel: string; destination: string }> = [];
    try {
      const db = context.supabase as AnyDb;
      const { data: rows } = await db
        .from("outreach_suppressions")
        .select("channel,destination")
        .eq("user_id", context.userId);
      suppressions.push(...(rows ?? []));
    } catch {
      // none
    }
    const suppressed = isSuppressed(suppressions, data.channel, destination);
    const hours = withinCallingHours();
    const draft = draftOwnerOutreach({
      ownerName: property.owner_name,
      address: property.address_raw ?? property.address_normalized,
      channel: data.channel,
      mentionDistress: !!data.mentionDistress,
    });
    return {
      property,
      draft,
      suppressed,
      callingHours: hours,
      disclaimer: OS_DISCLAIMERS.outreach,
      canSend:
        !demoOnly &&
        !suppressed.suppressed &&
        ((data.channel !== "phone" && data.channel !== "ai_call") || hours.ok),
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO draft only — send is disabled until Beginner+ outreach entitlement."
        : null,
    };
  });

export const getPortfolioCommandFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const entitlements = osEntitlementsForPlan(plan);

    let assets: any[] = [];
    try {
      const db = context.supabase as AnyDb;
      const { data } = await db.from("portfolio_assets").select("*").eq("user_id", context.userId);
      assets = data ?? [];
    } catch {
      assets = [];
    }

    if (!assets.length) {
      // DEMO portfolio derived from distress demo properties
      assets = listDemoProperties()
        .slice(0, 3)
        .map((p, i) => ({
          id: `demo-asset-${i}`,
          property_id: p.id,
          canonical_property_id: p.id,
          status: i === 0 ? "rehab" : "owned",
          purchase_price: p.opening_bid ?? Math.round((p.estimated_value ?? 200000) * 0.7),
          rehab_cost: p.estimated_rehab ?? 50000,
          loan_balance: Math.round((p.estimated_value ?? 200000) * 0.55),
          current_value_est: p.estimated_arv ?? p.estimated_value,
          rent_monthly: i === 0 ? 0 : Math.round((p.estimated_arv ?? 200000) * 0.008),
          vacancy_pct: 5,
          taxes_annual: 2400,
          insurance_annual: 1400,
          hoa_monthly: 0,
          maintenance_monthly: 150,
          monthly_payment: 1100,
          is_demo: true,
          address: p.address_raw,
          city: p.city,
          state_code: p.state_code,
        }));
    }

    const rollup = rollupPortfolio(assets);
    const rows = assets.map((a) => ({
      ...a,
      metrics: portfolioAssetMetrics(a),
    }));

    return {
      entitlements,
      rollup,
      assets: rows,
      insights: [
        {
          kind: "INFERENCE",
          text: "One or more assets may be refinance candidates based on estimated equity (estimate, not lender-verified).",
        },
        {
          kind: "INFERENCE",
          text: "Compare rent vs neighborhood estimates before adjusting leases.",
        },
      ],
      is_demo: rows.every((r) => r.is_demo),
    };
  });

export const listTransactionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const plan = await resolvePlan(context.supabase as AnyDb, context.userId);
    const demoOnly = !osEntitlementsForPlan(plan).transaction_center;
    try {
      const db = context.supabase as AnyDb;
      const { data } = await db
        .from("deal_transactions")
        .select("*, transaction_milestones(*)")
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false });
      if (data?.length) return { transactions: data, source: "database" as const };
    } catch {
      // fall through
    }
    const demoProps = listDemoProperties();
    const p = demoProps[0];
    const today = new Date();
    const addDays = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    return {
      source: "demo" as const,
      demoOnly,
      upgradeHint: demoOnly
        ? "DEMO transaction timeline only. Beginner+ unlocks live Transaction Command Center."
        : null,
      transactions: [
        {
          id: "demo-tx-1",
          phase: "inspection",
          contract_date: addDays(-5),
          closing_date: addDays(25),
          purchase_price: p?.opening_bid ?? 185000,
          earnest_money: 2000,
          inspection_deadline: addDays(2),
          diligence_deadline: addDays(10),
          financing_deadline: addDays(18),
          title_company: "DEMO Title Partners",
          lender_name: "Cumberland Hard Money (DEMO)",
          realtor_name: null,
          canonical_property_id: p?.id,
          address: p?.address_raw,
          is_demo: true,
          transaction_milestones: [
            { phase: "offer", title: "Offer submitted", status: "completed", due_at: addDays(-8) },
            {
              phase: "accepted",
              title: "Offer accepted",
              status: "completed",
              due_at: addDays(-5),
            },
            {
              phase: "earnest_money",
              title: "Earnest money deposited",
              status: "completed",
              due_at: addDays(-4),
            },
            {
              phase: "inspection",
              title: "Inspection contingency",
              status: "pending",
              due_at: addDays(2),
            },
            { phase: "title", title: "Title commitment", status: "pending", due_at: addDays(12) },
            {
              phase: "financing",
              title: "Financing contingency",
              status: "pending",
              due_at: addDays(18),
            },
            { phase: "closing", title: "Closing", status: "pending", due_at: addDays(25) },
          ],
          alert:
            "Inspection contingency expires in 2 days. Outstanding: sewer inspection, contractor estimate.",
        },
      ],
    };
  });

export const getInvestorDashboardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const props = listDemoProperties();
    const highOpp = props.filter((p) => (p.opportunity_score ?? 0) >= 70);
    const auctions = props.filter((p) => p.auction_date);
    return {
      opportunitiesToday: props.length,
      highOpportunityScore: highOpp.length,
      auctionsApproaching: auctions.length,
      ownerResponses: 4,
      offersAwaiting: 6,
      transactionsActive: 1,
      projectsUnderConstruction: 1,
      portfolioAlerts: 2,
      topOpportunities: highOpp.slice(0, 5),
      is_demo: true,
    };
  });
