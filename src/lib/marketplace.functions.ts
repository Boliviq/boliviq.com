import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTING_COLUMNS, toListing } from "@/lib/workspace.functions";
import type { MarketplaceLead, MarketplaceListing, SavedSearch } from "@/lib/workspace-store";

export type ListingSearchInput = {
  query?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  savedOnly?: boolean;
  includeExpired?: boolean;
};

const searchInput = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  savedOnly: z.boolean().optional(),
  includeExpired: z.boolean().optional(),
});

export const searchListingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => searchInput.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<MarketplaceListing[]> => {
    let q = context.supabase.from("marketplace_listings").select(LISTING_COLUMNS);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.minPrice != null) q = q.gte("price", data.minPrice);
    if (data.maxPrice != null) q = q.lte("price", data.maxPrice);
    if (data.location) q = q.ilike("location", `%${data.location}%`);
    if (data.query) {
      const safe = data.query.replace(/[,().%]/g, " ").trim();
      if (safe) {
        const like = `%${safe}%`;
        q = q.or(`title.ilike.${like},description.ilike.${like},location.ilike.${like}`);
      }
    }
    if (!data.includeExpired) {
      q = q.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    let listings = (rows ?? []).map(toListing);
    if (data.savedOnly) {
      const { data: saved, error: sErr } = await context.supabase
        .from("saved_listings")
        .select("listing_id");
      if (sErr) throw new Error(sErr.message);
      const ids = new Set((saved ?? []).map((s) => s.listing_id));
      listings = listings.filter((l) => ids.has(l.id));
    }
    return listings;
  });

const viewInput = z.object({ listingId: z.string().uuid() });

export const recordListingViewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => viewInput.parse(d))
  .handler(async ({ data, context }): Promise<{ views: number }> => {
    await context.supabase
      .from("listing_views")
      .upsert(
        { listing_id: data.listingId, viewer_id: context.userId },
        { onConflict: "listing_id,viewer_id", ignoreDuplicates: true },
      );
    const { count } = await context.supabase
      .from("listing_views")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", data.listingId);
    const views = count ?? 0;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("marketplace_listings")
      .update({ view_count: views })
      .eq("id", data.listingId);
    return { views };
  });

export const listSavedSearchesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedSearch[]> => {
    const { data, error } = await context.supabase
      .from("saved_searches")
      .select("id, name, query, category, location, min_price, max_price, alert_enabled")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      query: r.query,
      category: r.category,
      location: r.location,
      minPrice: r.min_price != null ? Number(r.min_price) : null,
      maxPrice: r.max_price != null ? Number(r.max_price) : null,
      alertEnabled: r.alert_enabled,
    }));
  });

const saveSearchInput = z.object({
  name: z.string().trim().min(1).max(120),
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  alertEnabled: z.boolean().optional(),
});

export const saveSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => saveSearchInput.parse(d))
  .handler(async ({ data, context }): Promise<SavedSearch> => {
    const { data: row, error } = await context.supabase
      .from("saved_searches")
      .insert({
        user_id: context.userId,
        name: data.name,
        query: data.query ?? "",
        category: data.category && data.category !== "all" ? data.category : null,
        location: data.location ?? null,
        min_price: data.minPrice ?? null,
        max_price: data.maxPrice ?? null,
        alert_enabled: data.alertEnabled ?? false,
      })
      .select("id, name, query, category, location, min_price, max_price, alert_enabled")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: row.id,
      name: row.name,
      query: row.query,
      category: row.category,
      location: row.location,
      minPrice: row.min_price != null ? Number(row.min_price) : null,
      maxPrice: row.max_price != null ? Number(row.max_price) : null,
      alertEnabled: row.alert_enabled,
    };
  });

const deleteSearchInput = z.object({ id: z.string().uuid() });

export const deleteSavedSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => deleteSearchInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("saved_searches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const leadInput = z.object({ listingId: z.string().uuid() });

export const convertListingToLeadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => leadInput.parse(d))
  .handler(async ({ data, context }): Promise<MarketplaceLead> => {
    const { data: listing, error: lErr } = await context.supabase
      .from("marketplace_listings")
      .select("id, title, price")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!listing) throw new Error("Listing not found");

    const { data: existing } = await context.supabase
      .from("leads")
      .select("id, listing_id, title, source, status")
      .eq("user_id", context.userId)
      .eq("listing_id", listing.id)
      .maybeSingle();
    if (existing) {
      return {
        id: existing.id,
        listingId: existing.listing_id,
        title: existing.title || listing.title,
        source: existing.source || "marketplace",
        status: existing.status,
      };
    }

    const { data: lead, error } = await context.supabase
      .from("leads")
      .insert({
        user_id: context.userId,
        listing_id: listing.id,
        title: listing.title,
        source: "marketplace",
        status: "new",
        opportunity_value: listing.price,
      })
      .select("id, listing_id, title, source, status")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: lead.id,
      listingId: lead.listing_id,
      title: lead.title || listing.title,
      source: lead.source || "marketplace",
      status: lead.status,
    };
  });
