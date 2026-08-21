import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DOCUMENT_SEED, type SeedDocument } from "@/lib/platform-seed";
import { isMissingRelation, fromTable } from "@/lib/supabase-safe";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { userId } = useCurrentUser();
  const [q, setQ] = useState("");

  const remote = useQuery({
    queryKey: ["documents", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await fromTable("documents").select("*").order("updated_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [] as SeedDocument[];
        throw error;
      }
      return ((data ?? []) as Record<string, unknown>[]).map((row): SeedDocument => ({
        id: String(row.id),
        name: String(row.name ?? "Document"),
        kind: String(row.kind ?? "File"),
        updated: String(row.updated_at ?? "").slice(0, 10),
      }));
    },
  });

  const docs = useMemo(() => {
    const merged = [...(remote.data ?? []), ...DOCUMENT_SEED];
    if (!q) return merged;
    const needle = q.toLowerCase();
    return merged.filter((d) => `${d.name} ${d.kind} ${d.property ?? ""} ${d.project ?? ""}`.toLowerCase().includes(needle));
  }, [remote.data, q]);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Contracts, estimates, inspections, appraisals, and plans — filed against the property, project, lead, or conversation they belong to."
      />
      <div className="space-y-4 p-4 sm:p-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="pl-9" />
        </div>
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#071729] text-[#7ccc35]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[d.property, d.project, d.conversation].filter(Boolean).join(" · ") || "Workspace file"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{d.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{d.updated}</span>
                  <Link to="/projects"><Button size="sm" variant="outline">Open record</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
