import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Users, Flame, Phone, TrendingUp, DollarSign,
  Sparkles, ArrowUpRight, Building2, CheckCircle2, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEntitlement } from "@/hooks/use-entitlement";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function toneClasses(t?: string) {
  if (t === "success") return "text-success";
  if (t === "warning") return "text-warning";
  if (t === "destructive") return "text-destructive";
  return "text-muted-foreground";
}

function Dashboard() {
  const { userId } = useCurrentUser();
  const { data: ent } = useEntitlement();

  const { data: properties = [] } = useQuery({
    queryKey: ["dashboard-properties", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["dashboard-leads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["dashboard-tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: calls = [] } = useQuery({
    queryKey: ["dashboard-calls", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("calls").select("*").order("called_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekAgo = Date.now() - 7 * 86400000;
  const newLeads = leads.filter((l: any) => new Date(l.created_at).getTime() >= weekAgo);
  const hot = properties.filter((p: any) => p.status === "hot" || p.deal_score >= 80);
  const followUps = calls.filter((c: any) => c.follow_up_at && new Date(c.follow_up_at).getTime() <= Date.now() + 86400000);
  const openTasks = tasks.filter((t: any) => t.status !== "done" && t.status !== "cancelled");
  const offers = leads.filter((l: any) => l.status === "negotiating" || l.status === "under_contract");
  const underContract = leads.filter((l: any) => l.status === "under_contract");
  const profit = properties.reduce((s: number, p: any) => s + (Number(p.estimated_profit) || 0), 0);
  const cashflow = properties.reduce((s: number, p: any) => s + (Number(p.monthly_cashflow) || 0), 0);

  const stats = [
    { label: "Total leads", value: String(leads.length), icon: Users, delta: `${newLeads.length} new this week`, tone: "default" as const },
    { label: "New leads this week", value: String(newLeads.length), icon: TrendingUp, delta: `${leads.length} total`, tone: "success" as const },
    { label: "Hot deals", value: String(hot.length), icon: Flame, delta: "Score 80+ or marked hot", tone: "warning" as const },
    { label: "Calls to follow up", value: String(followUps.length), icon: Phone, delta: `${openTasks.length} open tasks`, tone: "destructive" as const },
    { label: "Offers in play", value: String(offers.length), icon: CheckCircle2, delta: `${underContract.length} under contract` },
    { label: "Properties", value: String(properties.length), icon: Building2, delta: ent ? `${ent.maxProperties} plan limit` : "", tone: "success" as const },
    { label: "Projected profit", value: currency(profit), icon: DollarSign, delta: "Sum of estimated profit", tone: "success" as const },
    { label: "Monthly cash flow", value: currency(cashflow), icon: TrendingUp, delta: "Portfolio rent cash flow", tone: "success" as const },
  ];

  const recentLeads = properties.slice(0, 5);
  const upcoming = openTasks.slice(0, 5);

  const pipeline = useMemo(() => {
    const stages = ["new", "contacted", "qualified", "negotiating", "under_contract", "closed"];
    return stages.map((stage) => ({
      stage: stage.replace("_", " "),
      count: leads.filter((l: any) => l.status === stage).length,
    }));
  }, [leads]);

  const scoreDist = useMemo(() => {
    const buckets = [
      { range: "0-20", n: 0 }, { range: "21-40", n: 0 }, { range: "41-60", n: 0 },
      { range: "61-80", n: 0 }, { range: "81-100", n: 0 },
    ];
    properties.forEach((p: any) => {
      const s = Number(p.deal_score) || 0;
      if (s <= 20) buckets[0].n += 1;
      else if (s <= 40) buckets[1].n += 1;
      else if (s <= 60) buckets[2].n += 1;
      else if (s <= 80) buckets[3].n += 1;
      else buckets[4].n += 1;
    });
    return buckets;
  }, [properties]);

  const recs = useMemo(() => {
    const items: { title: string; detail: string }[] = [];
    const top = [...properties].sort((a: any, b: any) => (b.deal_score ?? 0) - (a.deal_score ?? 0))[0];
    if (top?.address) items.push({ title: `Prioritize ${top.address}`, detail: `Score ${top.deal_score ?? "—"} · Est. profit ${currency(top.estimated_profit)}` });
    const stale = leads.find((l: any) => l.status === "new" || l.status === "contacted");
    if (stale) items.push({ title: "Work a stale lead", detail: `Lead in ${stale.status} — log a call or set a follow-up.` });
    const overdue = openTasks.find((t: any) => t.due_at && new Date(t.due_at).getTime() < Date.now());
    if (overdue) items.push({ title: overdue.title, detail: "This task is overdue." });
    if (ent && !ent.paid) items.push({ title: "Unlock Professional AI", detail: "Upgrade in Billing for call summaries, scripts, and deal memos." });
    if (items.length === 0) items.push({ title: "Add your first property", detail: "Import a CSV or paste a listing URL to get started." });
    return items.slice(0, 3);
  }, [properties, leads, openTasks, ent]);

  return (
    <>
      <PageHeader
        title="Welcome back."
        description={ent ? `${ent.planName} · ${ent.creditsUsed}/${ent.creditsIncluded} AI credits this period.` : "Let's build your next great investment."}
        action={
          <Link to="/properties">
            <Button size="sm" className="gap-2">Add property <ArrowUpRight className="h-4 w-4" /></Button>
          </Link>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
                    <div className={`mt-1 text-xs ${toneClasses(s.tone)}`}>{s.delta}</div>
                  </div>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <s.icon className={`h-4 w-4 ${toneClasses(s.tone)}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Recent properties</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.length === 0 && <p className="text-sm text-muted-foreground">No properties yet.</p>}
              {recentLeads.map((l: any) => (
                <Link key={l.id} to="/properties" className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.address}</div>
                    <div className="text-xs text-muted-foreground">{currency(l.list_price)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{l.status ?? "active"}</Badge>
                    <div className="rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                      {l.deal_score ?? "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming tasks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No open tasks.</p>}
              {upcoming.map((t: any) => (
                <Link key={t.id} to="/tasks" className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.due_at ? new Date(t.due_at).toLocaleDateString() : "No due date"}</div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Deal score distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="range" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="n" fill="var(--success)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline overview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pipeline.map((p) => {
                const max = Math.max(1, ...pipeline.map((x) => x.count));
                const pct = (p.count / max) * 100;
                return (
                  <div key={p.stage}>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="capitalize">{p.stage}</span><span className="text-muted-foreground">{p.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-success/30 bg-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-success" /> Recommended next actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recs.map((r) => (
                <div key={r.title} className="rounded-lg border border-success/20 bg-background p-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.detail}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent calls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {calls.slice(0, 4).map((c: any) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{c.contact_name || c.purpose || "Call"}</div>
                    <div className="text-xs text-muted-foreground">{c.called_at ? new Date(c.called_at).toLocaleString() : ""}</div>
                  </div>
                </div>
              ))}
              {calls.length === 0 && <p className="text-sm text-muted-foreground">No calls logged yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
