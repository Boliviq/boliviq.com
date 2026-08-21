import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/hooks/use-workspace";
import { addDocument, listDocuments } from "@/lib/workspace-store";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

const KINDS = ["Estimate", "Inspection", "Disclosure", "Contract", "Plan", "Insurance", "Closing", "Other"];

function DocumentsPage() {
  const { userId, tick } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ name: "", kind: "Estimate", related: "", restricted: false });

  const docs = useMemo(() => {
    const merged = listDocuments(userId);
    if (!q) return merged;
    const needle = q.toLowerCase();
    return merged.filter((d) => `${d.name} ${d.kind} ${d.related}`.toLowerCase().includes(needle));
  }, [userId, q, tick]);

  const add = () => {
    if (!draft.name.trim()) {
      toast.error("Add a file name");
      return;
    }
    if (!userId) {
      toast.error("Sign in to attach documents");
      return;
    }
    addDocument(userId, {
      name: draft.name,
      kind: draft.kind,
      related: draft.related || "Workspace file",
      restricted: draft.restricted,
    });
    setCompose(false);
    setDraft({ name: "", kind: "Estimate", related: "", restricted: false });
    toast.success("Document attached to the workspace record");
  };

  return (
    <>
      <PageHeader
        title="Documents"
        description="Contracts, estimates, inspections, appraisals, and plans — filed against the property, project, lead, or conversation they belong to."
        action={
          <Button className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]" onClick={() => setCompose(true)}>
            <Plus className="h-4 w-4" /> Attach document
          </Button>
        }
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
                    <div className="text-xs text-muted-foreground">{d.related || "Workspace file"}</div>
                    {d.restricted && <div className="mt-1 text-[11px] font-medium text-destructive">Restricted — do not email wiring or closing instructions</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{d.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{d.updatedAt.slice(0, 10)}</span>
                  <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/projects" })}>Open record</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach a document record</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Files stay linked to the property or project. Restricted items are never suggested for email.</p>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Kitchen scope of work.pdf" /></div>
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Related property / project</Label><Input value={draft.related} onChange={(e) => setDraft({ ...draft, related: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose(false)}>Cancel</Button>
            <Button onClick={add} className="bg-[#70bf2b] hover:bg-[#80ce38]">Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
