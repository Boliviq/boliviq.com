import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "moderator" | "user";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { search?: string; page?: number; perPage?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const perPage = Math.min(data.perPage ?? 100, 200);
    const page = data.page ?? 1;
    const { data: usersRes, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const ids = usersRes.users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const rolesByUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const nameById = new Map<string, string>();
    (profiles ?? []).forEach((p: any) => nameById.set(p.id, p.full_name ?? ""));

    const search = (data.search ?? "").toLowerCase().trim();
    const users = usersRes.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        full_name: nameById.get(u.id) ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        roles: rolesByUser.get(u.id) ?? [],
      }))
      .filter((u) =>
        !search ||
        u.email.toLowerCase().includes(search) ||
        u.full_name.toLowerCase().includes(search) ||
        u.id.includes(search),
      );

    return { users, page, perPage, total: users.length };
  });

const roleSchema = z.enum(["admin", "moderator", "user"]);

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string; role: AppRole; grant: boolean }) =>
    z.object({ userId: z.string().uuid(), role: roleSchema, grant: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    if (!data.grant && data.role === "admin" && data.userId === context.userId) {
      throw new Error("You cannot remove your own admin role");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [usersRes, profiles, properties, calls, submissions, subscriptions] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("id, full_name, created_at"),
      supabaseAdmin.from("properties").select("id, user_id", { count: "exact" }),
      supabaseAdmin.from("calls").select("id", { count: "exact", head: true }),
      (supabaseAdmin as any).from("inbound_submissions").select("*").order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("subscriptions").select("user_id, plan, status, created_at"),
    ]);

    const users = usersRes.data?.users ?? [];
    const nameById = new Map((profiles.data ?? []).map((p: any) => [p.id, p.full_name ?? ""]));
    const propsByUser = new Map<string, number>();
    (properties.data ?? []).forEach((p: any) => propsByUser.set(p.user_id, (propsByUser.get(p.user_id) ?? 0) + 1));
    const subByUser = new Map<string, any>();
    (subscriptions.data ?? []).forEach((s: any) => {
      if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, s);
    });

    const activeSubs = (subscriptions.data ?? []).filter((s: any) =>
      ["active", "trialing", "past_due"].includes(String(s.status).toLowerCase()),
    );
    const newUsers7d = users.filter((u) => u.created_at && u.created_at >= weekAgo).length;

    const userRows = users.slice(0, 50).map((u) => {
      const sub = subByUser.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        name: nameById.get(u.id) || (u.email ?? "User").split("@")[0],
        plan: sub?.plan ?? "Free",
        status: sub?.status ?? "none",
        properties: propsByUser.get(u.id) ?? 0,
        joined: (u.created_at ?? "").slice(0, 10),
      };
    });

    return {
      totalUsers: users.length,
      newUsers7d,
      activeSubscriptions: activeSubs.length,
      properties: properties.count ?? 0,
      calls: calls.count ?? 0,
      inboundOpen: (submissions.data ?? []).length,
      users: userRows,
      submissions: submissions.data ?? [],
    };
  });

export const listInboundSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("inbound_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMarketingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [usersRes, coupons, submissions, subscriptions] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("coupons").select("code, name, discount_type, discount_value, current_uses, active, admin_only").order("created_at", { ascending: false }).limit(50),
      (supabaseAdmin as any).from("inbound_submissions").select("*").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("subscriptions").select("status, created_at"),
    ]);
    const users = usersRes.data?.users ?? [];
    const couponRows = coupons.data ?? [];
    const redemptions = couponRows.reduce((sum: number, c: any) => sum + (c.current_uses ?? 0), 0);
    const activeSubs = (subscriptions.data ?? []).filter((s: any) =>
      ["active", "trialing", "past_due"].includes(String(s.status).toLowerCase()),
    );
    return {
      newUsers7d: users.filter((u) => u.created_at && u.created_at >= weekAgo).length,
      activeSubscriptions: activeSubs.length,
      couponRedemptions: redemptions,
      inboundCount: (submissions.data ?? []).length,
      coupons: couponRows,
      submissions: submissions.data ?? [],
    };
  });
