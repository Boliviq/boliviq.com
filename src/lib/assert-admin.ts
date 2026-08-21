/**
 * Admin checks that do not depend on EXECUTE grants for has_role().
 * A previous migration revoked has_role from authenticated, which broke
 * supabase.rpc('has_role') on the user-scoped client.
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

export async function isMasterAdminUser(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("is_master_admin", { _user_id: userId });
  if (error) {
    const { data: admins, error: adminErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1);
    if (adminErr) throw new Error(error.message);
    return admins?.[0]?.user_id === userId;
  }
  return !!data;
}

export async function assertMasterAdminUser(userId: string): Promise<void> {
  if (!(await isMasterAdminUser(userId))) throw new Error("Forbidden: master admin only");
}
