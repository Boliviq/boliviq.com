import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Search, FileText, Phone, Building2, ShieldAlert, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { runBillingDiagnostics } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { userId, loading } = useCurrentUser();
  const { data, isLoading } = useQuery({
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

  if (loading || isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!data) {
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
  return <Admin />;
}

type DemoUser = { id: string; email: string; name: string; plan: string; status: "active" | "trial" | "canceled"; properties: number; joined: string };

const demoUsers: DemoUser[] = [
  { id: "u1", email: "alex@example.com", name: "Alex Ramirez", plan: "Professional", status: "active", properties: 218, joined: "2026-04-12" },
  { id: "u2", email: "priya@example.com", name: "Priya Shah", plan: "Starter", status: "trial", properties: 34, joined: "2026-07-01" },
  { id: "u3", email: "jordan@example.com", name: "Jordan Tan", plan: "Team", status: "active", properties: 1240, joined: "2025-11-03" },
  { id: "u4", email: "sam@example.com", name: "Sam Wu", plan: "Free", status: "canceled", properties: 6, joined: "2026-05-19" },
];

function Admin() {
  const [q, setQ] = useState("");
  const filtered = demoUsers.filter((u) => (u.email + u.name).toLowerCase().includes(q.toLowerCase()));
  const diagFn = useServerFn(runBillingDiagnostics);
  const [diag, setDiag] = useState<Awaited<ReturnType<typeof runBillingDiagnostics>> | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);

  async function runDiag() {
    setDiagBusy(true);
    try {
      const res = await diagFn({ data: { environment: getStripeEnvironment() } });
      setDiag(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Diagnostics failed.");
    } finally {
      setDiagBusy(false);
    }
  }



  return (
    <>
      <PageHeader title="Admin dashboard" description="Operational overview. Placeholder metrics shown until real analytics are wired up." />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <strong>Plan pricing</strong> — master admin can change every plan price, extra-seat rate, and sync Stripe lookup keys.
          </div>
          <Link to="/admin/pricing" className="text-primary underline text-sm">Open Plan pricing →</Link>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <strong>Billing Launch Verification</strong> — guided owner checks that must pass before public launch.
          </div>
          <Link to="/admin/launch-verification" className="text-primary underline text-sm">Open Launch Verification →</Link>
        </div>
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <strong>Checkout Verification</strong> — confirms deployed checkout uses embedded_page and validates every plan before card entry.
          </div>
          <Link to="/admin/checkout-verification" className="text-primary underline text-sm">Open Checkout Verification →</Link>
        </div>
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <strong>Preview data.</strong> The metrics and users below are placeholders. Real analytics wire-up is on the launch backlog.
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Billing diagnostics ({getStripeEnvironment()})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Verify that every Boliviq plan lookup key exists in Stripe for the current environment. Never displays secret keys.</p>
            <Button size="sm" onClick={runDiag} disabled={diagBusy}>{diagBusy ? "Running…" : "Run diagnostics"}</Button>
            {diag && (
              <div className="mt-3 rounded-md border">
                <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                  Env: <strong>{diag.environment}</strong> · API key: {diag.apiKeyConfigured ? "configured" : "MISSING"} · Webhook: {diag.webhookConfigured ? "configured" : "MISSING"}
                  {"fatal" in diag && diag.fatal && <div className="mt-1 text-destructive">{diag.fatal}</div>}
                </div>
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Lookup key</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Interval</th>
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diag.prices.map((p) => {
                      const tone =
                        p.status === "PASS" ? "text-success" :
                        p.status === "WARNING" ? "text-warning" :
                        "text-destructive";
                      const Icon = p.status === "PASS" ? CheckCircle2 : XCircle;
                      return (
                        <tr key={p.lookupKey} className="border-t align-top">
                          <td className="p-2 font-mono">{p.lookupKey}</td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 ${tone}`}>
                              <Icon className="h-3.5 w-3.5" />{p.status}
                            </span>
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {p.amount != null ? `$${p.amount.toFixed(2)}` : "—"}
                            {p.amountMatches === false && (
                              <div className="text-[10px] text-warning">exp ${p.expectedAmount}</div>
                            )}
                          </td>
                          <td className="p-2">
                            {p.interval ?? "—"}
                            {p.intervalMatches === false && (
                              <div className="text-[10px] text-warning">exp {p.expectedInterval}</div>
                            )}
                          </td>
                          <td className="p-2">
                            {p.productName ?? "—"}
                            {p.productActive === false && (
                              <div className="text-[10px] text-destructive">archived</div>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {p.notes?.length ? p.notes.join(" ") : "—"}
                            {p.error && <div className="text-destructive">{p.error}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Total users" value="1,284" delta="+42 this week" />
          <Stat icon={DollarSign} label="MRR" value="$18,340" delta="+6.2% MoM" />
          <Stat icon={TrendingUp} label="Active subscriptions" value="612" delta="+18 this week" />
          <Stat icon={TrendingDown} label="Churn (30d)" value="2.1%" delta="—" tone="warning" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Trial users" value="89" />
          <Stat icon={Building2} label="Properties created" value="42,318" />
          <Stat icon={Phone} label="Calls logged" value="6,102" />
          <Stat icon={FileText} label="Reports generated" value="3,447" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Support requests</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center justify-between"><span>Open</span><Badge>7</Badge></div>
              <div className="mt-2 flex items-center justify-between"><span>Waiting on customer</span><Badge variant="secondary">3</Badge></div>
              <div className="mt-2 flex items-center justify-between"><span>Resolved (7d)</span><Badge variant="outline">24</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>System errors (24h)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div>0 critical · 3 warnings · 128 info</div>
              <p className="mt-2 text-xs">Wire an error monitor (Sentry / LogRocket / Highlight) to populate this in production.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Users</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Properties</th>
                    <th className="text-left py-2 pl-4">Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-2">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-2">{u.plan}</td>
                      <td className="py-2">
                        <Badge variant={u.status === "active" ? "default" : u.status === "trial" ? "secondary" : "outline"}>{u.status}</Badge>
                      </td>
                      <td className="py-2 text-right tabular-nums">{u.properties.toLocaleString()}</td>
                      <td className="py-2 pl-4">{u.joined}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toast.info("Plan change UI — connect Stripe to enable.")}>Change plan</Button>
                          <Button size="sm" variant="ghost" onClick={() => toast.warning(`${u.name} would be disabled.`)}>Disable</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, delta, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta?: string; tone?: "warning" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
          <Icon className={`h-4 w-4 ${tone === "warning" ? "text-warning" : "text-success"}`} />
          {label}
        </div>
        <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
        {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
      </CardContent>
    </Card>
  );
}
