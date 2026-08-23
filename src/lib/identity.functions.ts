import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isProfileRoleId, type ProfileRoleId } from "@/lib/canons";

/**
 * Phase 2 identity / access: workspaces, invites, session history,
 * suspension/appeal, and a server-side access snapshot used to gate the app.
 */

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: string;
  owner: boolean;
  current: boolean;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: string;
  createdAt: string;
};

export type SessionLogRow = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export type AccessState = {
  onboarded: boolean;
  primaryRole: ProfileRoleId;
  secondaryRoles: ProfileRoleId[];
  suspended: boolean;
  suspensionReason: string | null;
  appealStatus: string | null;
  appealNote: string | null;
  phoneVerified: boolean;
  isAdmin: boolean;
  currentWorkspaceId: string | null;
};

async function ensurePersonalWorkspace(
  supabase: {
    from: (table: "profiles" | "workspaces" | "workspace_members") => any;
  },
  userId: string,
): Promise<string> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("current_workspace_id")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (profile?.current_workspace_id) return profile.current_workspace_id as string;

  const { data: owned } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned?.id) {
    await supabase.from("profiles").update({ current_workspace_id: owned.id }).eq("id", userId);
    return owned.id as string;
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (member?.workspace_id) {
    await supabase
      .from("profiles")
      .update({ current_workspace_id: member.workspace_id })
      .eq("id", userId);
    return member.workspace_id as string;
  }

  const { data: ws, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: userId, name: "Personal workspace" })
    .select("id")
    .single();
  if (error || !ws) throw new Error(error?.message ?? "Could not create workspace");
  await supabase.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner",
  });
  await supabase.from("profiles").upsert({ id: userId, current_workspace_id: ws.id });
  return ws.id as string;
}

export const getAccessStateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const currentWorkspaceId = await ensurePersonalWorkspace(context.supabase, context.userId);
    const [{ data: profile, error }, { data: isAdmin }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "onboarded, primary_role, secondary_roles, suspended_at, suspension_reason, appeal_status, appeal_note, phone_verified_at, current_workspace_id",
        )
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (error) throw new Error(error.message);
    return {
      onboarded: !!profile?.onboarded,
      primaryRole: isProfileRoleId(profile?.primary_role) ? profile.primary_role : "homeowner",
      secondaryRoles: (profile?.secondary_roles ?? []).filter(isProfileRoleId),
      suspended: !!profile?.suspended_at,
      suspensionReason: profile?.suspension_reason ?? null,
      appealStatus: profile?.appeal_status ?? null,
      appealNote: profile?.appeal_note ?? null,
      phoneVerified: !!profile?.phone_verified_at,
      isAdmin: !!isAdmin,
      currentWorkspaceId: profile?.current_workspace_id ?? currentWorkspaceId,
    };
  });

export const listWorkspacesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkspaceSummary[]> => {
    const currentId = await ensurePersonalWorkspace(context.supabase, context.userId);
    const { data: memberships, error } = await context.supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const ids = (memberships ?? []).map((m) => m.workspace_id);
    if (ids.length === 0) return [];
    const { data: workspaces, error: wErr } = await context.supabase
      .from("workspaces")
      .select("id, name, owner_id")
      .in("id", ids);
    if (wErr) throw new Error(wErr.message);
    const roleById = new Map((memberships ?? []).map((m) => [m.workspace_id, m.role]));
    return (workspaces ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      role: roleById.get(w.id) ?? "member",
      owner: w.owner_id === context.userId,
      current: w.id === currentId,
    }));
  });

const createWorkspaceInput = z.object({
  name: z.string().trim().min(1).max(120),
});

export const createWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createWorkspaceInput.parse(d))
  .handler(async ({ data, context }): Promise<WorkspaceSummary> => {
    const { data: ws, error } = await context.supabase
      .from("workspaces")
      .insert({ owner_id: context.userId, name: data.name })
      .select("id, name, owner_id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: context.userId,
      role: "owner",
    });
    if (mErr) throw new Error(mErr.message);
    await context.supabase
      .from("profiles")
      .update({ current_workspace_id: ws.id })
      .eq("id", context.userId);
    return {
      id: ws.id,
      name: ws.name,
      role: "owner",
      owner: true,
      current: true,
    };
  });

const inviteInput = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().email().max(200),
  role: z.string().trim().max(40).optional(),
});

export const inviteToWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }): Promise<WorkspaceInvite> => {
    const email = data.email.toLowerCase();
    const { data: row, error } = await context.supabase
      .from("workspace_invites")
      .upsert(
        {
          workspace_id: data.workspaceId,
          email,
          role: data.role ?? "member",
          invited_by: context.userId,
          accepted_at: null,
        },
        { onConflict: "workspace_id,email" },
      )
      .select("id, workspace_id, email, role, created_at")
      .single();
    if (error) throw new Error(error.message);
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("name")
      .eq("id", data.workspaceId)
      .maybeSingle();
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workspaceName: ws?.name ?? "Workspace",
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
    };
  });

export const listMyInvitesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkspaceInvite[]> => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!email) return [];
    const { data, error } = await context.supabase
      .from("workspace_invites")
      .select("id, workspace_id, email, role, created_at, accepted_at")
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    const pending = (data ?? []).filter((r) => r.email.toLowerCase() === email.toLowerCase());
    if (pending.length === 0) return [];
    const ids = pending.map((r) => r.workspace_id);
    const { data: workspaces } = await context.supabase
      .from("workspaces")
      .select("id, name")
      .in("id", ids);
    const nameById = new Map((workspaces ?? []).map((w) => [w.id, w.name]));
    return pending.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      workspaceName: nameById.get(r.workspace_id) ?? "Workspace",
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
    }));
  });

const acceptInviteInput = z.object({ inviteId: z.string().uuid() });

export const acceptInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => acceptInviteInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: invite, error } = await context.supabase
      .from("workspace_invites")
      .select("id, workspace_id, role, email, accepted_at")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite || invite.accepted_at) throw new Error("Invite is no longer valid");
    const { error: mErr } = await context.supabase.from("workspace_members").insert({
      workspace_id: invite.workspace_id,
      user_id: context.userId,
      role: invite.role || "member",
    });
    if (mErr) throw new Error(mErr.message);
    const { error: uErr } = await context.supabase
      .from("workspace_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (uErr) throw new Error(uErr.message);
    await context.supabase
      .from("profiles")
      .update({ current_workspace_id: invite.workspace_id })
      .eq("id", context.userId);
    return { ok: true };
  });

const switchWorkspaceInput = z.object({ workspaceId: z.string().uuid() });

export const switchWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => switchWorkspaceInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: membership, error } = await context.supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!membership) throw new Error("You are not a member of that workspace");
    const { error: uErr } = await context.supabase
      .from("profiles")
      .update({ current_workspace_id: data.workspaceId })
      .eq("id", context.userId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const recordSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("auth_session_log").insert({
      user_id: context.userId,
      user_agent: "Boliviq web",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSessionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionLogRow[]> => {
    const { data, error } = await context.supabase
      .from("auth_session_log")
      .select("id, user_agent, created_at, last_seen_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
    }));
  });

const appealInput = z.object({
  note: z.string().trim().min(8).max(2000),
});

export const submitAppealFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => appealInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ appeal_status: "pending", appeal_note: data.note })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const verifyPhoneInput = z.object({
  phone: z.string().trim().min(7).max(40),
});

export const verifyPhoneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => verifyPhoneInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // SMS delivery is Phase 10. Phase 2 records the number and marks it verified
    // after the user confirms they control the device in-app.
    const { error } = await context.supabase
      .from("profiles")
      .update({
        phone: data.phone,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
