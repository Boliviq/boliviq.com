import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { listAllUsers, setUserRole } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersGate,
});

type AppRole = "admin" | "moderator" | "user";
const ALL_ROLES: AppRole[] = ["admin", "moderator", "user"];

function AdminUsersGate() {
  const { userId, loading } = useCurrentUser();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  if (loading || isLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account does not have the <code>admin</code> role.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AdminUsers currentUserId={userId!} />;
}

function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const listFn = useServerFn(listAllUsers);
  const setRoleFn = useServerFn(setUserRole);
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => listFn({ data: { page, perPage: 100 } }),
  });

  const filtered = useMemo(() => {
    const users = data?.users ?? [];
    const s = q.toLowerCase().trim();
    if (!s) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s) || u.id.includes(s),
    );
  }, [data, q]);

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole; grant: boolean }) => setRoleFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(`${vars.grant ? "Granted" : "Revoked"} ${vars.role}`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update role"),
  });

  return (
    <>
      <PageHeader title="Users" description="View all accounts and change their roles." />
      <div className="space-y-4 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>All users {data && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>}</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search email, name, or ID…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">User</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Joined</th>
                      <th className="py-2 text-left">Last sign-in</th>
                      {ALL_ROLES.map((r) => (
                        <th key={r} className="py-2 pl-4 text-left capitalize">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const isSelf = u.id === currentUserId;
                      return (
                        <tr key={u.id} className="border-t align-top">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{u.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                            <div className="text-[10px] text-muted-foreground/70">{u.id}</div>
                          </td>
                          <td className="py-3 pr-4">
                            {u.email_confirmed_at ? (
                              <Badge variant="secondary">Verified</Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )}
                            {isSelf && <Badge className="ml-1">You</Badge>}
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                          </td>
                          {ALL_ROLES.map((role) => {
                            const has = u.roles.includes(role);
                            const disableSelfAdmin = isSelf && role === "admin" && has;
                            return (
                              <td key={role} className="py-3 pl-4">
                                <Checkbox
                                  checked={has}
                                  disabled={mutation.isPending || disableSelfAdmin}
                                  onCheckedChange={(v) =>
                                    mutation.mutate({ userId: u.id, role, grant: !!v })
                                  }
                                  aria-label={`${role} role for ${u.email}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4 + ALL_ROLES.length} className="py-8 text-center text-sm text-muted-foreground">
                          No users match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div>{isFetching && !isLoading ? "Refreshing…" : `Page ${page}`}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={isFetching || (data?.users.length ?? 0) < 100} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
