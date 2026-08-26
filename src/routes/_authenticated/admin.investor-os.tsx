import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getInvestorDashboardFn } from "@/lib/investor-os.functions";

export const Route = createFileRoute("/_authenticated/admin/investor-os")({
  component: AdminInvestorOsGate,
});

function AdminInvestorOsGate() {
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

  if (loading || isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Investor OS intelligence is restricted to admins.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AdminInvestorOs />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AdminInvestorOs() {
  const dashFn = useServerFn(getInvestorDashboardFn);
  const { data } = useQuery({
    queryKey: ["admin-investor-os-dash"],
    queryFn: () => dashFn(),
  });

  const sections = [
    { title: "Property Intelligence", href: "/distressed-opportunities" },
    { title: "Distressed Property Coverage", href: "/admin/distress" },
    { title: "AI Acquisition", href: "/investor-os/acquisition" },
    { title: "Marketplace", href: "/marketplace" },
    { title: "Construction", href: "/investor-os" },
    { title: "Funding", href: "/investor-os/capital" },
    { title: "Outreach", href: "/investor-os" },
    { title: "Data Providers", href: "/admin/distress" },
    { title: "Opportunity Radar", href: "/investor-os/radar" },
    { title: "Portfolio", href: "/investor-os/portfolio" },
    { title: "System Health", href: "/admin/launch-verification" },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Admin · Investor OS Intelligence"
        description="Coverage and health across the connected property-centered operating system."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Opportunities (demo catalog)" value={data?.opportunitiesToday ?? "—"} />
        <Metric label="High opportunity" value={data?.highOpportunityScore ?? "—"} />
        <Metric label="Auctions approaching" value={data?.auctionsApproaching ?? "—"} />
        <Metric label="OS migration" value="20260826060000" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.title} to={s.href as any} className="block">
            <Card className="h-full hover:border-[#70bf2b]/50">
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Activity className="h-4 w-4 text-[#70bf2b]" />
                <CardTitle className="text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">open</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
