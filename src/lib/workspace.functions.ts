import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AccountProfile,
  AssistantTurn,
  ConversationExtras,
  CreditLedgerRow,
  DirectoryProfessional,
  DocRecord,
  MarketplaceListing,
  ProjectRecord,
  Thread,
} from "@/lib/workspace-store";
import { DEFAULT_ACCOUNT } from "@/lib/workspace-store";
import { PROFESSIONAL_SEED } from "@/lib/professional-seed";
import type {
  ConversationThreadTypeId,
  MarketplaceCategoryId,
  ProfileRoleId,
  VerificationTierId,
} from "@/lib/canons";
import { isProfileRoleId } from "@/lib/canons";
import { inferThreadType, type NotificationPreferenceView } from "@/lib/communication";
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

export function toListing(row: {
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
  subcategory?: string | null;
  view_count?: number | null;
  response_count?: number | null;
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
    subcategory: row.subcategory ?? undefined,
    viewCount: Number(row.view_count ?? 0),
    responseCount: Number(row.response_count ?? 0),
  };
}

export const LISTING_COLUMNS =
  "id, user_id, title, description, category, location, price, price_label, details, visibility, expires_at, created_at, subcategory, view_count, response_count";

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
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
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

// ---------------------------------------------------------------------------
// Conversations / messages
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ThreadContext = ConversationExtras & { label?: string };

function encodeThreadContext(label: string, extra?: ConversationExtras): string {
  return JSON.stringify({
    label,
    property: extra?.property,
    project: extra?.project,
    listing: extra?.listing,
    listingId: extra?.listingId,
    participants: extra?.participants,
  } satisfies ThreadContext);
}

function decodeThreadContext(raw: string | null | undefined): ThreadContext {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ThreadContext;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* stored as a plain label before extras were JSON */
  }
  return { label: raw };
}

function toThread(
  row: {
    id: string;
    title: string | null;
    context: string | null;
    listing_id: string | null;
    thread_type?: string | null;
    updated_at: string;
    created_at: string;
  },
  messages: Thread["messages"],
  currentUserId: string,
  lastReadAt?: string | null,
): Thread {
  const extra = decodeThreadContext(row.context);
  const last = messages.at(-1);
  const readAt = lastReadAt ? Date.parse(lastReadAt) : 0;
  const unread = messages.filter((m) => !m.mine && Date.parse(m.at) > readAt).length;
  return {
    id: row.id,
    title: row.title || extra.listing || extra.project || "Conversation",
    context: extra.label || row.context || "Direct message",
    participants: extra.participants?.length ? extra.participants : ["You"],
    lastMessage: last?.body ?? "",
    updatedAt: last?.at ?? row.updated_at ?? row.created_at,
    unread,
    threadType: (row.thread_type as ConversationThreadTypeId | undefined) ?? inferThreadType(extra),
    property: extra.property,
    project: extra.project,
    listing: extra.listing,
    listingId: extra.listingId ?? row.listing_id ?? undefined,
    messages: messages.map((m) => ({
      ...m,
      mine: m.mine || m.from === "You",
    })),
  };
}

export const listConversationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Thread[]> => {
    const { data: convos, error } = await context.supabase
      .from("conversations")
      .select("id, title, context, listing_id, thread_type, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (convos ?? []).map((c) => c.id);
    if (ids.length === 0) return [];

    const { data: reads } = await context.supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", context.userId)
      .in("conversation_id", ids);
    const lastRead = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));

    const { data: msgs, error: mErr } = await context.supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const byConvo = new Map<string, Thread["messages"]>();
    for (const m of msgs ?? []) {
      const list = byConvo.get(m.conversation_id) ?? [];
      list.push({
        id: m.id,
        from: m.sender_id === context.userId ? "You" : "Participant",
        body: m.body,
        at: m.created_at,
        mine: m.sender_id === context.userId,
      });
      byConvo.set(m.conversation_id, list);
    }

    return (convos ?? []).map((c) =>
      toThread(c, byConvo.get(c.id) ?? [], context.userId, lastRead.get(c.id)),
    );
  });

const startConversationInput = z.object({
  title: z.string().trim().min(1).max(300),
  context: z.string().trim().max(300).optional(),
  firstMessage: z.string().trim().min(1).max(8000),
  extra: z
    .object({
      property: z.string().trim().max(300).optional(),
      project: z.string().trim().max(300).optional(),
      listing: z.string().trim().max(300).optional(),
      listingId: z.string().optional(),
      participants: z.array(z.string().trim().max(120)).optional(),
      participantUserId: z.string().uuid().optional(),
    })
    .optional(),
});

export const startConversationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => startConversationInput.parse(d))
  .handler(async ({ data, context }): Promise<string> => {
    const listingId =
      data.extra?.listingId && UUID_RE.test(data.extra.listingId) ? data.extra.listingId : null;
    const encoded = encodeThreadContext(data.context ?? "Direct message", data.extra);
    const threadType = inferThreadType({
      property: data.extra?.property,
      project: data.extra?.project,
      listingId,
      participantCount: data.extra?.participantUserId ? 2 : 1,
    });
    const { data: convo, error } = await context.supabase
      .from("conversations")
      .insert({
        created_by: context.userId,
        title: data.title,
        context: encoded,
        listing_id: listingId,
        thread_type: threadType,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: partErr } = await context.supabase.from("conversation_participants").insert({
      conversation_id: convo.id,
      user_id: context.userId,
    });
    if (partErr) throw new Error(partErr.message);

    if (data.extra?.participantUserId && data.extra.participantUserId !== context.userId) {
      const { error: otherErr } = await context.supabase.from("conversation_participants").insert({
        conversation_id: convo.id,
        user_id: data.extra.participantUserId,
      });
      if (otherErr) throw new Error(otherErr.message);
    }

    const { error: msgErr } = await context.supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: context.userId,
      body: data.firstMessage,
    });
    if (msgErr) throw new Error(msgErr.message);

    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convo.id);

    if (listingId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: listing } = await supabaseAdmin
        .from("marketplace_listings")
        .select("response_count")
        .eq("id", listingId)
        .maybeSingle();
      await supabaseAdmin
        .from("marketplace_listings")
        .update({ response_count: Number(listing?.response_count ?? 0) + 1 })
        .eq("id", listingId);
    }

    return convo.id;
  });

const sendMessageInput = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
});

export const sendMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => sendMessageInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: others } = await context.supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.conversationId)
      .neq("user_id", context.userId);
    const otherIds = (others ?? []).map((p) => p.user_id);
    if (otherIds.length > 0) {
      const { data: blocked } = await context.supabase
        .from("conversation_blocks")
        .select("blocker_id")
        .eq("blocked_id", context.userId)
        .in("blocker_id", otherIds)
        .limit(1);
      if ((blocked ?? []).length > 0) {
        throw new Error("You cannot message a user who has blocked you.");
      }
    }

    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      sender_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

export const markConversationReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DEFAULT_PREFS: NotificationPreferenceView = {
  emailEnabled: true,
  smsEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "America/Chicago",
  optedOutAt: null,
};

export const getNotificationPreferencesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPreferenceView> => {
    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select(
        "email_enabled, sms_enabled, quiet_hours_start, quiet_hours_end, timezone, opted_out_at",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_PREFS;
    return {
      emailEnabled: data.email_enabled,
      smsEnabled: data.sms_enabled,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
      timezone: data.timezone,
      optedOutAt: data.opted_out_at,
    };
  });

const prefsInput = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  timezone: z.string().trim().min(1).max(80),
  optedOut: z.boolean(),
});

export const saveNotificationPreferencesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => prefsInput.parse(d))
  .handler(async ({ data, context }): Promise<NotificationPreferenceView> => {
    const row = {
      user_id: context.userId,
      email_enabled: data.emailEnabled,
      sms_enabled: data.smsEnabled,
      quiet_hours_start: data.quietHoursStart,
      quiet_hours_end: data.quietHoursEnd,
      timezone: data.timezone,
      opted_out_at: data.optedOut ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = await context.supabase
      .from("notification_preferences")
      .upsert(row, { onConflict: "user_id" })
      .select(
        "email_enabled, sms_enabled, quiet_hours_start, quiet_hours_end, timezone, opted_out_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return {
      emailEnabled: saved.email_enabled,
      smsEnabled: saved.sms_enabled,
      quietHoursStart: saved.quiet_hours_start,
      quietHoursEnd: saved.quiet_hours_end,
      timezone: saved.timezone,
      optedOutAt: saved.opted_out_at,
    };
  });

export const blockUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (data.userId === context.userId) throw new Error("You cannot block yourself.");
    const { error } = await context.supabase.from("conversation_blocks").insert({
      blocker_id: context.userId,
      blocked_id: data.userId,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const reportConversationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ conversationId: z.string().uuid(), reason: z.string().trim().min(3).max(500) })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("conversation_reports").insert({
      conversation_id: data.conversationId,
      reporter_id: context.userId,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Professionals
// ---------------------------------------------------------------------------

function seedToDirectory(p: (typeof PROFESSIONAL_SEED)[number]): DirectoryProfessional {
  return {
    id: p.id,
    name: p.name,
    company: p.company,
    role: p.role,
    serviceArea: p.serviceArea,
    specialties: p.specialties,
    license: p.license,
    insurance: p.insurance,
    bio: p.bio,
    source: "seed",
    rating: p.rating,
    reviews: p.reviews,
    responseTime: p.responseTime,
    years: p.years,
    trades: p.trades,
    tiers: p.tiers,
  };
}

export const listProfessionalsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DirectoryProfessional[]> => {
    const { data, error } = await context.supabase
      .from("professional_profiles")
      .select(
        "id, user_id, role, company_name, bio, service_area, specialties, license_number, insurance_policy",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return PROFESSIONAL_SEED.map(seedToDirectory);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.company_name || "Professional",
      company: r.company_name || "",
      role: isProfileRoleId(r.role) ? r.role : "other",
      serviceArea: r.service_area || "",
      specialties: r.specialties ?? [],
      license: r.license_number ?? undefined,
      insurance: r.insurance_policy ?? undefined,
      bio: r.bio || "",
      source: "db" as const,
      tiers: [] as VerificationTierId[],
    }));
  });

const upsertProfessionalInput = z.object({
  role: z.string(),
  companyName: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  serviceArea: z.string().trim().max(200).optional(),
  specialties: z.array(z.string().trim().max(80)).optional(),
  licenseNumber: z.string().trim().max(80).optional(),
  insurancePolicy: z.string().trim().max(120).optional(),
});

export const upsertProfessionalProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => upsertProfessionalInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const role = isProfileRoleId(data.role) ? data.role : "other";
    const { error } = await context.supabase.from("professional_profiles").upsert(
      {
        user_id: context.userId,
        role,
        company_name: data.companyName ?? null,
        bio: data.bio ?? null,
        service_area: data.serviceArea ?? null,
        specialties: data.specialties ?? [],
        license_number: data.licenseNumber ?? null,
        insurance_policy: data.insurancePolicy ?? null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export const listVerificationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerificationTierId[]> => {
    const { data, error } = await context.supabase
      .from("verification_records")
      .select("tier")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.tier as VerificationTierId);
  });

const startVerificationInput = z.object({
  tier: z.enum(["identity", "license", "insurance", "boliviq_certified"]),
});

export const startVerificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => startVerificationInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: existing, error: readErr } = await context.supabase
      .from("verification_records")
      .select("id")
      .eq("user_id", context.userId)
      .eq("tier", data.tier)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing) return { ok: true };
    const { error } = await context.supabase.from("verification_records").insert({
      user_id: context.userId,
      tier: data.tier,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export type CreditWalletView = {
  walletId: string;
  balance: number;
  reserved: number;
  ledger: CreditLedgerRow[];
};

export const getCreditWalletFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditWalletView> => {
    const { data: existingWallet, error } = await context.supabase
      .from("credit_wallets")
      .select("id, balance")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    let wallet = existingWallet;
    if (!wallet) {
      const { data: created, error: cErr } = await context.supabase
        .from("credit_wallets")
        .insert({ user_id: context.userId, balance: 0 })
        .select("id, balance")
        .single();
      if (cErr) throw new Error(cErr.message);
      wallet = created;
    }

    const { data: rows, error: lErr } = await context.supabase
      .from("credit_ledger")
      .select("id, label, delta, status, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false });
    if (lErr) throw new Error(lErr.message);

    const ledger: CreditLedgerRow[] = (rows ?? []).map((r) => ({
      id: r.id,
      at: r.created_at,
      label: r.label,
      delta: Number(r.delta),
      status: r.status as CreditLedgerRow["status"],
    }));
    const reserved = ledger
      .filter((r) => r.status === "reserved")
      .reduce((s, r) => s + Math.abs(r.delta), 0);

    return {
      walletId: wallet.id,
      balance: Number(wallet.balance ?? 0),
      reserved,
      ledger,
    };
  });

// ---------------------------------------------------------------------------
// Account / onboarding draft
// ---------------------------------------------------------------------------

function draftFromProfile(row: {
  full_name: string | null;
  phone: string | null;
  primary_role: string;
  secondary_roles: string[] | null;
  account_kind: "individual" | "company";
  language: string;
  service_area: string | null;
  comms_consent: boolean;
  terms_accepted_at: string | null;
  onboarded: boolean;
  onboarding_step: number;
  account_draft: Json;
}): AccountProfile {
  const extra =
    row.account_draft && typeof row.account_draft === "object" && !Array.isArray(row.account_draft)
      ? (row.account_draft as Record<string, unknown>)
      : {};
  return {
    ...DEFAULT_ACCOUNT,
    full_name: row.full_name || String(extra.full_name ?? ""),
    phone: row.phone || String(extra.phone ?? ""),
    primary_role: isProfileRoleId(row.primary_role) ? row.primary_role : "homeowner",
    secondary_roles: (row.secondary_roles ?? []).filter(isProfileRoleId),
    account_kind: row.account_kind,
    language: row.language || "en",
    service_area: row.service_area || String(extra.service_area ?? ""),
    company_name: String(extra.company_name ?? ""),
    license: String(extra.license ?? ""),
    insurance: String(extra.insurance ?? ""),
    categories: Array.isArray(extra.categories) ? extra.categories.map(String) : [],
    consent_comms: row.comms_consent,
    consent_terms: !!row.terms_accepted_at,
    onboarded: row.onboarded,
    onboarding_step: row.onboarding_step || 1,
  };
}

export const getAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountProfile> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "full_name, phone, primary_role, secondary_roles, account_kind, language, service_area, comms_consent, terms_accepted_at, onboarded, onboarding_step, account_draft",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ...DEFAULT_ACCOUNT };
    return draftFromProfile(data);
  });

const accountInput = z.object({
  full_name: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  primary_role: z.string().optional(),
  secondary_roles: z.array(z.string()).optional(),
  account_kind: z.enum(["individual", "company"]).optional(),
  language: z.string().max(12).optional(),
  service_area: z.string().max(200).optional(),
  company_name: z.string().max(200).optional(),
  license: z.string().max(80).optional(),
  insurance: z.string().max(120).optional(),
  categories: z.array(z.string()).optional(),
  consent_comms: z.boolean().optional(),
  consent_terms: z.boolean().optional(),
  onboarded: z.boolean().optional(),
  onboarding_step: z.number().int().min(1).max(10).optional(),
});

export const saveAccountDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => accountInput.parse(d))
  .handler(async ({ data, context }): Promise<AccountProfile> => {
    const primary =
      data.primary_role && isProfileRoleId(data.primary_role) ? data.primary_role : undefined;
    const secondary = (data.secondary_roles ?? []).filter(isProfileRoleId);
    const draft = {
      company_name: data.company_name ?? "",
      license: data.license ?? "",
      insurance: data.insurance ?? "",
      categories: data.categories ?? [],
      phone: data.phone ?? "",
      full_name: data.full_name ?? "",
      service_area: data.service_area ?? "",
    };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .upsert({
        id: context.userId,
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
        primary_role: primary ?? "homeowner",
        secondary_roles: secondary,
        account_kind: data.account_kind ?? "individual",
        language: data.language ?? "en",
        service_area: data.service_area ?? null,
        comms_consent: data.consent_comms ?? false,
        onboarded: data.onboarded ?? false,
        onboarding_step: data.onboarding_step ?? 1,
        ...(data.consent_terms ? { terms_accepted_at: new Date().toISOString() } : {}),
        account_draft: draft as unknown as Json,
      })
      .select(
        "full_name, phone, primary_role, secondary_roles, account_kind, language, service_area, comms_consent, terms_accepted_at, onboarded, onboarding_step, account_draft",
      )
      .single();
    if (error) throw new Error(error.message);
    return draftFromProfile(row);
  });

// ---------------------------------------------------------------------------
// Assistant log
// ---------------------------------------------------------------------------

export const getAssistantLogFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssistantTurn[]> => {
    const { data, error } = await context.supabase
      .from("assistant_logs")
      .select("messages")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const raw = data?.messages;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((m): m is AssistantTurn => {
        return (
          !!m &&
          typeof m === "object" &&
          (m as AssistantTurn).role !== undefined &&
          typeof (m as AssistantTurn).text === "string"
        );
      })
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
  });

const saveAssistantInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(16000),
    }),
  ),
});

export const saveAssistantLogFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => saveAssistantInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("assistant_logs").upsert(
      {
        user_id: context.userId,
        title: "Assistant",
        messages: data.messages as unknown as Json,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
