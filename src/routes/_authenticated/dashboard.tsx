import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Users, Flame, Phone, FileSignature, FileCheck2, TrendingUp, DollarSign,
  Sparkles, ArrowUpRight, Building2, CheckCircle2, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const stats = [
  { label: "Total leads", value: "142", icon: Users, delta: "+8 this week", tone: "default" as const },
  { label: "New leads this week", value: "8", icon: TrendingUp, delta: "+22%", tone: "success" as const },
  { label: "Hot deals", value: "6", icon: Flame, delta: "3 need review", tone: "warning" as const },
  { label: "Calls to follow up", value: "12", icon: Phone, delta: "4 overdue", tone: "destructive" as const },
  { label: "Offers submitted", value: "9", icon: FileSignature, delta: "2 pending" },
  { label: "Under contract", value: "3", icon: FileCheck2, delta: "$1.2M value", tone: "success" as const },
  { label: "Projected profit", value: "$284k", icon: DollarSign, delta: "Across 12 deals", tone: "success" as const },
  { label: "Monthly cash flow", value: "$6,420", icon: TrendingUp, delta: "Rental portfolio", tone: "success" as const },
];

const recentLeads = [
  { addr: "412 Oak Street, Austin TX", price: "$285,000", score: 87, status: "hot" },
  { addr: "1220 Maple Ave, Dallas TX", price: "$342,500", score: 72, status: "warm" },
  { addr: "88 Riverside Dr, Houston TX", price: "$198,000", score: 91, status: "hot" },
  { addr: "705 Elm Court, San Antonio TX", price: "$425,000", score: 54, status: "cool" },
  { addr: "33 Pine Lane, Fort Worth TX", price: "$310,000", score: 68, status: "warm" },
];

const upcomingTasks = [
  { title: "Call seller — 412 Oak St", due: "Today, 3:00 PM" },
  { title: "Send offer — 88 Riverside Dr", due: "Tomorrow" },
  { title: "Inspection — 1220 Maple Ave", due: "Thu 10:00 AM" },
  { title: "Follow up with agent — 33 Pine Ln", due: "Fri" },
];

const pipeline = [
  { stage: "New", count: 42 }, { stage: "Contacted", count: 28 }, { stage: "Qualified", count: 19 },
  { stage: "Negotiating", count: 11 }, { stage: "Contract", count: 3 }, { stage: "Closed", count: 5 },
];

const scoreDist = [
  { range: "0-20", n: 6 }, { range: "21-40", n: 14 }, { range: "41-60", n: 38 },
  { range: "61-80", n: 52 }, { range: "81-100", n: 32 },
];

const activity = [
  { icon: CheckCircle2, text: "Offer accepted on 88 Riverside Dr", time: "12m ago", tone: "success" },
  { icon: Phone, text: "Logged call with seller of 412 Oak St", time: "1h ago" },
  { icon: Building2, text: "Added new lead: 705 Elm Court", time: "3h ago" },
  { icon: FileSignature, text: "Submitted offer on 1220 Maple Ave", time: "Yesterday" },
];

function toneClasses(t?: string) {
  if (t === "success") return "text-success";
  if (t === "warning") return "text-warning";
  if (t === "destructive") return "text-destructive";
  return "text-muted-foreground";
}

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Welcome back."
        description="Let's build your next great investment. Powered by Boliviq AI."
        action={
          <Link to="/properties">
            <Button size="sm" className="gap-2">Add property <ArrowUpRight className="h-4 w-4" /></Button>
          </Link>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          Demonstration data — replace with your real leads
        </Badge>

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
            <CardHeader><CardTitle className="text-base">Recent property leads</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.map((l) => (
                <div key={l.addr} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.addr}</div>
                    <div className="text-xs text-muted-foreground">{l.price}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={
                      l.status === "hot" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                      l.status === "warm" ? "border-warning/40 bg-warning/10 text-warning" :
                      "border-muted text-muted-foreground"
                    }>
                      {l.status}
                    </Badge>
                    <div className="rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                      {l.score}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming tasks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.map((t) => (
                <div key={t.title} className="flex items-start gap-3 rounded-lg border p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.due}</div>
                  </div>
                </div>
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
                const max = Math.max(...pipeline.map((x) => x.count));
                const pct = (p.count / max) * 100;
                return (
                  <div key={p.stage}>
                    <div className="flex justify-between text-xs font-medium">
                      <span>{p.stage}</span><span className="text-muted-foreground">{p.count}</span>
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
                <Sparkles className="h-4 w-4 text-success" /> AI recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg border border-success/20 bg-background p-3">
                <div className="font-medium">Prioritize 88 Riverside Dr</div>
                <div className="text-xs text-muted-foreground">Score 91 · Estimated profit $52k · Below market by 14%.</div>
              </div>
              <div className="rounded-lg border border-success/20 bg-background p-3">
                <div className="font-medium">Follow up on 412 Oak St</div>
                <div className="text-xs text-muted-foreground">Seller motivation high. No contact in 5 days.</div>
              </div>
              <div className="rounded-lg border border-success/20 bg-background p-3">
                <div className="font-medium">Pass on 705 Elm Court</div>
                <div className="text-xs text-muted-foreground">Rehab exceeds your $60k max budget by 35%.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted ${toneClasses(a.tone)}`}>
                    <a.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{a.text}</div>
                    <div className="text-xs text-muted-foreground">{a.time}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
