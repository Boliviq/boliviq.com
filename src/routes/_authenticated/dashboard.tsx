import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { dashboardForRole, LIFECYCLE } from "@/lib/canons";
import { useAccount } from "@/hooks/use-current-user";
import { useWorkspace } from "@/hooks/use-workspace";
import { listDocuments, listListings, listProjects, listThreads } from "@/lib/workspace-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { account } = useAccount();
  const { userId, tick } = useWorkspace();
  const dash = dashboardForRole(account.primary_role);
  const live = {
    listings: listListings(userId).length,
    messages: listThreads(userId).length,
    projects: listProjects(userId).length,
    documents: listDocuments(userId).length,
  };
  void tick;

  return (
    <>
      <PageHeader
        title={dash.greeting}
        description={dash.description}
        action={
          <Link to={dash.primaryAction.to}>
            <Button size="sm" className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]">
              {dash.primaryAction.label} <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          Connected workspace — demonstration figures mix with anything you add
        </Badge>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Marketplace posts",
              value: String(live.listings),
              hint: "Including your saved workspace listings",
            },
            {
              label: "Conversations",
              value: String(live.messages),
              hint: "Property- and project-linked threads",
            },
            {
              label: "Projects",
              value: String(live.projects),
              hint: "Repair requests that became jobs",
            },
            {
              label: "Documents",
              value: String(live.documents),
              hint: "Filed against the matching record",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Do next</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {dash.quickLinks.map((q) => (
                <Link
                  key={q.to + q.label}
                  to={q.to}
                  className="rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="text-sm font-semibold">{q.label}</div>
                  <div className="text-xs text-muted-foreground">{q.detail}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-[#70bf2b]" /> Connected lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {LIFECYCLE.map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.detail}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
