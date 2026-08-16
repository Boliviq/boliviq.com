/**
 * Admin checks that do not depend on `has_role` EXECUTE grants for the
 * authenticated role. The 2026-07-15 migration revoked that RPC from
 * `authenticated`, which broke every `supabase.rpc('has_role')` call made
 * with the caller's JWT. Service-role reads of `user_roles` remain valid.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function assertAdminUser(userId: string): Promise<void> {
  if (!(await isAdminUser(userId))) throw new Error("Forbidden");
}
