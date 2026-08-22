import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DocRecord, ProjectRecord, MarketplaceListing } from "@/lib/workspace-store";
import type { MarketplaceCategoryId, ProfileRoleId } from "@/lib/canons";
import type { Json } from "@/integrations/supabase/types";

/**
 * Supabase-backed data access for canon workspace records.
 *
 * These server functions replace the browser-`localStorage` prototype in
 * `workspace-store.ts` for the migrated modules. Every call runs through
 * `requireSupabaseAuth`, so `context.supabase` is an RLS-scoped client bound to
 * the caller's JWT — reads and writes are automatically isolated to the
 * authenticated user by the row-level-security policies in the canon migration.
 */

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DOC_STATUS = "Other";

export const listDocumentsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DocRecord[]> => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, name, kind, related, restricted, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind ?? DOC_STATUS,
      related: d.related ?? "",
      restricted: !!d.restricted,
      updatedAt: d.updated_at ?? d.created_at ?? new Date().toISOString(),
    }));
  });

const documentInput = z.object({
  name: z.string().trim().min(1).max(300),
  kind: z.string().trim().max(100).optional(),
  related: z.string().trim().max(300).optional(),
  restricted: z.boolean().optional(),
});

export const createDocumentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => documentInput.parse(d))
  .handler(async ({ data, context }): Promise<DocRecord> => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        name: data.name,
        kind: data.kind ?? DOC_STATUS,
        related: data.related ?? "",
        restricted: data.restricted ?? false,
      })
      .select("id, name, kind, related, restricted, updated_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: row.id,
      name: row.name,
      kind: row.kind ?? DOC_STATUS,
      related: row.related ?? "",
      restricted: !!row.restricted,
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    };
  });

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const PROJECT_STATUSES = [
  "new",
  "estimating",
  "in_progress",
  "awaiting_approval",
  "completed",
] as const;

function toProjectRecord(row: {
  id: string;
  name: string;
  address: string | null;
  status: string;
  budget: number | null;
  spent: number | null;
  next_milestone: string | null;
}): ProjectRecord {
  const status = (PROJECT_STATUSES as readonly string[]).includes(row.status)
    ? (row.status as ProjectRecord["status"])
    : "new";
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    status,
    // `roleView` has no dedicated column; it is a presentational hint only.
    roleView: "",
    budget: Number(row.budget ?? 0),
    spent: Number(row.spent ?? 0),
    nextMilestone: row.next_milestone ?? "",
  };
}

export const listProjectsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProjectRecord[]> => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, address, status, budget, spent, next_milestone")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProjectRecord);
  });

const projectInput = z.object({
  name: z.string().trim().min(1).max(300),
  address: z.string().trim().max(300).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  budget: z.number().nonnegative().optional(),
  spent: z.number().nonnegative().optional(),
  nextMilestone: z.string().trim().max(300).optional(),
});

export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }): Promise<ProjectRecord> => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        user_id: context.userId,
        name: data.name,
        address: data.address ?? null,
        status: data.status ?? "new",
        budget: data.budget ?? null,
        spent: data.spent ?? 0,
        next_milestone: data.nextMilestone ?? null,
      })
      .select("id, name, address, status, budget, spent, next_milestone")
      .single();
    if (error) throw new Error(error.message);
    return toProjectRecord(row);
  });

// ---------------------------------------------------------------------------
// Marketplace listings + saved favorites + reports
// ---------------------------------------------------------------------------

type ListingDetails = {
  city?: string;
  state?: string;
  budget?: number;
  photos?: string[];
  postedBy?: string;
  role?: string;
  authorName?: string;
  authorRole?: string;
  propertyLabel?: string;
  projectLabel?: string;
};

function toListing(row: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  price: number | null;
  price_label: string | null;
  details: unknown;
  visibility: string | null;
  expires_at: string | null;
  created_at: string | null;
}): MarketplaceListing {
  const d = (row.details ?? {}) as ListingDetails;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category as MarketplaceCategoryId,
    location: row.location ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    price: row.price != null ? Number(row.price) : undefined,
    budget: d.budget,
    photos: Array.isArray(d.photos) ? d.photos : [],
    postedBy: d.postedBy ?? "",
    role: (d.role as ProfileRoleId) ?? "homeowner",
    propertyLabel: d.propertyLabel,
    projectLabel: d.projectLabel,
    createdAt: (row.created_at ?? "").slice(0, 10),
    priceLabel: row.price_label ?? undefined,
    authorName: d.authorName,
    authorRole: d.authorRole as ProfileRoleId | undefined,
    visibility: (row.visibility as "public" | "limited") ?? "public",
    expiresAt: row.expires_at ?? undefined,
    ownerId: row.user_id,
  };
}

const LISTING_COLUMNS =
  "id, user_id, title, description, category, location, price, price_label, details, visibility, expires_at, created_at";

export const listListingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MarketplaceListing[]> => {
    const { data, error } = await context.supabase
      .from("marketplace_listings")
      .select(LISTING_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toListing);
  });

const listingInput = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1).max(100),
  location: z.string().trim().max(300).optional(),
  price: z.number().nonnegative().optional(),
  budget: z.number().nonnegative().optional(),
  photos: z.array(z.string().url()).max(20).optional(),
  role: z.string().trim().max(100).optional(),
  authorName: z.string().trim().max(200).optional(),
  postedBy: z.string().trim().max(200).optional(),
  propertyLabel: z.string().trim().max(300).optional(),
  projectLabel: z.string().trim().max(300).optional(),
  visibility: z.enum(["public", "limited"]).optional(),
});

export const createListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listingInput.parse(d))
  .handler(async ({ data, context }): Promise<MarketplaceListing> => {
    const details: ListingDetails = {
      budget: data.budget,
      photos: data.photos,
      postedBy: data.postedBy ?? data.authorName,
      role: data.role,
      authorName: data.authorName,
      authorRole: data.role,
      propertyLabel: data.propertyLabel,
      projectLabel: data.projectLabel,
    };
    const { data: row, error } = await context.supabase
      .from("marketplace_listings")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        location: data.location ?? "",
        price: data.price ?? null,
        visibility: data.visibility ?? "public",
        details: details as unknown as Json,
      })
      .select(LISTING_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return toListing(row);
  });

export const listSavedListingIdsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data, error } = await context.supabase.from("saved_listings").select("listing_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.listing_id);
  });

const toggleSavedInput = z.object({ listingId: z.string().uuid() });

export const toggleSavedListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => toggleSavedInput.parse(d))
  .handler(async ({ data, context }): Promise<{ saved: boolean }> => {
    const { data: existing, error: readErr } = await context.supabase
      .from("saved_listings")
      .select("id")
      .eq("listing_id", data.listingId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing) {
      const { error } = await context.supabase
        .from("saved_listings")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await context.supabase
      .from("saved_listings")
      .insert({ user_id: context.userId, listing_id: data.listingId });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

const reportInput = z.object({
  listingId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export const reportListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("listing_reports").insert({
      user_id: context.userId,
      listing_id: data.listingId,
      reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    // Flag the listing for moderation via the service role (owner RLS would
    // otherwise prevent a non-owner from updating the row).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("marketplace_listings")
      .update({ reported: true })
      .eq("id", data.listingId);
    return { ok: true };
  });
