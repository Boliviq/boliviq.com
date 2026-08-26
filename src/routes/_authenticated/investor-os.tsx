import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Radar,
  Sparkles,
  Building2,
  Wallet,
  HardHat,
  ShieldAlert,
  Route as RouteIcon,
  Briefcase,
  Phone,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInvestorDashboardFn, getOsEntitlementsFn } from "@/lib/investor-os.functions";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investor-os")({
  component: InvestorOsDashboard,
});

const MODULES = [
  {
    title: "Find Deals",
    href: "/distressed-opportunities",
    icon: Building2,
    detail: "Distressed + on-market intelligence",
  },
  {
    title: "AI Acquisition",
    href: "/investor-os/acquisition",
    icon: Sparkles,
    detail: "Natural-language buy box search",
  },
  {
    title: "Opportunity Radar",
    href: "/investor-os/radar",
    icon: Radar,
    detail: "Always-on buy box alerts",
  },
  {
    title: "Capital Marketplace",
    href: "/investor-os/capital",
    icon: Wallet,
    detail: "Match lenders to the deal",
  },
  {
    title: "Transactions",
    href: "/investor-os/transactions",
    icon: RouteIcon,
    detail: "Offer → closing command center",
  },
  {
    title: "Portfolio",
    href: "/investor-os/portfolio",
    icon: Briefcase,
    detail: "Owned assets & cash flow",
  },
] as const;

function InvestorOsDashboard() {
  const dashFn = useServerFn(getInvestorDashboardFn);
  const entFn = useServerFn(getOsEntitlementsFn);
  const { data } = useQuery({
    queryKey: ["investor-os-dashboard"],
    queryFn: () => dashFn(),
  });
  const { data: ent } = useQuery({
    queryKey: ["investor-os-entitlements"],
    queryFn: () => entFn(),
  });

  const stats = [
    { label: "Opportunities today", value: data?.opportunitiesToday ?? "—" },
    { label: "High opportunity", value: data?.highOpportunityScore ?? "—" },
    { label: "Auctions approaching", value: data?.auctionsApproaching ?? "—" },
    { label: "Owner responses", value: data?.ownerResponses ?? "—" },
    { label: "Offers awaiting", value: data?.offersAwaiting ?? "—" },
    { label: "Active transactions", value: data?.transactionsActive ?? "—" },
    { label: "Under construction", value: data?.projectsUnderConstruction ?? "—" },
    { label: "Portfolio alerts", value: data?.portfolioAlerts ?? "—" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Investor Operating System"
        description="One property record — discover, analyze, fund, renovate, close, and hold."
        action={
          <Button asChild size="sm" className="bg-[#70bf2b] hover:bg-[#80ce38]">
            <Link to="/investor-os/radar">Open Radar</Link>
          </Button>
        }
      />

      <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
        {data?.is_demo
          ? "DEMO DATA mixed with live CRM when available — never presented as verified county records"
          : "Live workspace"}
        {ent?.plan ? ` · Plan: ${ent.plan}` : null}
      </Badge>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link key={m.href} to={m.href} className="group block">
            <Card className="h-full transition-colors group-hover:border-[#70bf2b]/60">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <m.icon className="h-5 w-5 text-[#70bf2b]" />
                <CardTitle className="text-base">{m.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{m.detail}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top opportunities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.topOpportunities ?? []).map((p: any) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <Link
                  to="/investor-os/passport/$id"
                  params={{ id: p.id }}
                  className="font-medium hover:underline"
                >
                  {p.address_raw}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {[p.city, p.state_code].filter(Boolean).join(", ")} · Opp {p.opportunity_score} ·
                  Distress {p.distress_score}
                  {p.is_demo ? " · DEMO" : ""}
                </div>
              </div>
              <div className="text-sm tabular-nums text-muted-foreground">
                ARV {currency(p.estimated_arv)}
              </div>
            </div>
          ))}
          {!data?.topOpportunities?.length ? (
            <p className="text-sm text-muted-foreground">No ranked opportunities yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Deal risk</div>
              <p className="text-muted-foreground">Early-warning signals inside each Passport.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <HardHat className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Construction</div>
              <p className="text-muted-foreground">Scope, materials, labor, bid packages.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Buyers & outreach</div>
              <p className="text-muted-foreground">
                <Phone className="mr-1 inline h-3 w-3" />
                Matching + compliant contact drafts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
