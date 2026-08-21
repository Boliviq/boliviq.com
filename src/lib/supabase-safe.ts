import { supabase } from "@/integrations/supabase/client";

/** Detect PostgREST / Postgres missing-relation errors so UI can fall back to seed data. */
export function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const text = `${e.code ?? ""} ${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  return (
    e.code === "42P01" ||
    e.code === "42703" ||
    e.code === "PGRST205" ||
    e.code === "PGRST204" ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find the table")
  );
}

export function fromTable(name: string) {
  return (supabase as any).from(name);
}
