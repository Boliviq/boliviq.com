import type { SupabaseClient } from "@supabase/supabase-js";
import { VERIFICATION_DISCLAIMER, VERIFICATION_TIERS, type VerificationTierId } from "@/lib/canons";

export type VerificationRequest = {
  id: string;
  userId: string;
  tier: VerificationTierId;
  status: string;
  notes: string | null;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  disclaimer: string;
};

const GRANTABLE = new Set<VerificationTierId>([
  "identity",
  "license",
  "insurance",
  "boliviq_certified",
]);

export function publicBadges(records: { tier: string; status: string }[]): VerificationTierId[] {
  return records
    .filter((r) => r.status === "granted" && GRANTABLE.has(r.tier as VerificationTierId))
    .map((r) => r.tier as VerificationTierId);
}

export function publicDisplayLabel(
  badges: VerificationTierId[],
): "unverified" | VerificationTierId[] {
  return badges.length === 0 ? "unverified" : badges;
}

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export async function listPendingVerifications(
  supabase: SupabaseClient,
  adminId: string,
): Promise<VerificationRequest[]> {
  await assertAdmin(supabase, adminId);
  const { data, error } = await supabase
    .from("verification_records")
    .select("id, user_id, tier, status, notes, review_reason, reviewed_by, reviewed_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    tier: r.tier as VerificationTierId,
    status: r.status,
    notes: r.notes,
    reviewReason: r.review_reason,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    disclaimer: VERIFICATION_DISCLAIMER,
  }));
}

export async function reviewVerification(
  supabase: SupabaseClient,
  adminId: string,
  input: { id: string; decision: "granted" | "rejected"; reason: string },
): Promise<VerificationRequest> {
  await assertAdmin(supabase, adminId);
  const { data: current, error: readErr } = await supabase
    .from("verification_records")
    .select("id, user_id, tier, status, notes, review_reason, reviewed_by, reviewed_at")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!current) throw new Error("Verification request not found");
  if (current.tier === "unverified") throw new Error("Unverified is not a grantable badge");
  if (!GRANTABLE.has(current.tier as VerificationTierId)) {
    throw new Error("This tier cannot be granted");
  }
  if (current.status !== "pending") throw new Error("Only pending requests can be reviewed");

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("verification_records")
    .update({
      status: input.decision,
      review_reason: input.reason,
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq("id", input.id)
    .select("id, user_id, tier, status, notes, review_reason, reviewed_by, reviewed_at")
    .single();
  if (error) throw new Error(error.message);

  const { error: auditErr } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action: `verification_${input.decision}`,
    record_type: "verification_records",
    record_id: input.id,
    previous_value: { status: current.status },
    new_value: { status: input.decision, tier: current.tier },
    reason: input.reason,
  });
  if (auditErr) throw new Error(auditErr.message);

  return {
    id: updated.id,
    userId: updated.user_id,
    tier: updated.tier as VerificationTierId,
    status: updated.status,
    notes: updated.notes,
    reviewReason: updated.review_reason,
    reviewedBy: updated.reviewed_by,
    reviewedAt: updated.reviewed_at,
    disclaimer: VERIFICATION_DISCLAIMER,
  };
}

export function isGrantableTier(tier: string): boolean {
  return GRANTABLE.has(tier as VerificationTierId) && tier !== VERIFICATION_TIERS[0].id;
}
