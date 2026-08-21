import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HardHat } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROJECT_SEED, type SeedProject } from "@/lib/platform-seed";
import { isMissingRelation, fromTable } from "@/lib/supabase-safe";
import { useCurrentUser } from "@/hooks/use-current-user";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

const STATUS_LABEL: Record<SeedProject["status"], string> = {
  intake: "Intake",
  estimating: "Estimating",
  scheduled: "Scheduled",
  in_progress: "In progress",
  punch: "Punch list",
  complete: "Complete",
};

function ProjectsPage() {
  const { userId } = useCurrentUser();
  const remote = useQuery({
    queryKey: ["projects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await fromTable("projects").select("*").order("updated_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [] as SeedProject[];
        throw error;
      }
      return ((data ?? []) as Record<string, unknown>[]).map((row): SeedProject => ({
        id: String(row.id),
        title: String(row.title ?? "Project"),
        status: (row.status as SeedProject["status"]) || "intake",
        property: String(row.property_id ?? "Unlinked property"),
        budget: Number(row.budget ?? 0),
        owner: "You",
        updated: String(row.updated_at ?? "").slice(0, 10),
      }));
    },
  });

  const projects = useMemo(() => [...(remote.data ?? []), ...PROJECT_SEED], [remote.data]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Repair requests and estimates become projects. Each job stays linked to the property, lead, documents, and conversation that created it."
      />
      <div className="space-y-4 p-4 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-display text-lg font-bold">
                      <HardHat className="h-4 w-4 text-[#70bf2b]" /> {p.title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{p.property}</div>
                  </div>
                  <Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
                {p.lead && <div className="text-xs text-muted-foreground">From: {p.lead}</div>}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>Budget {currency(p.budget)}</span>
                  {p.contractor && <span>GC {p.contractor}</span>}
                  <span className="text-muted-foreground">Updated {p.updated}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/messages"><Button size="sm">Open conversation</Button></Link>
                  <Link to="/documents"><Button size="sm" variant="outline">Documents</Button></Link>
                  <Link to="/marketplace"><Button size="sm" variant="outline">Related listing</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
