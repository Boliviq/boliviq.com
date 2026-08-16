import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { choosePaidSubscription, entitlementFromSubscription, type Entitlement } from "@/lib/entitlements";

export const getEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Entitlement> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: isAdmin }, { data: sub }, { count }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      supabaseAdmin
        .from("subscriptions")
        .select("plan, status, stripe_customer_id, current_period_end, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(8),
      (supabaseAdmin as any)
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .gte("created_at", monthStartIso()),
    ]);

    const rows = (sub ?? []) as any[];
    const chosen = choosePaidSubscription(rows);

    return entitlementFromSubscription({
      subscription: chosen,
      isAdmin: !!isAdmin,
      creditsUsed: count ?? 0,
    });
  });

export const getWorkspaceUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const [properties, leads, tasks, calls, reports] = await Promise.all([
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("calls").select("id", { count: "exact", head: true }).eq("user_id", userId),
      (supabaseAdmin as any).from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "report").gte("created_at", monthStartIso()),
    ]);
    return {
      properties: properties.count ?? 0,
      leads: leads.count ?? 0,
      tasks: tasks.count ?? 0,
      calls: calls.count ?? 0,
      reportsThisPeriod: reports.count ?? 0,
    };
  });

function monthStartIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
