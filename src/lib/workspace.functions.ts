import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DocRecord, ProjectRecord } from "@/lib/workspace-store";

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
