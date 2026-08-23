import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HardHat, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useProjects, useCreateProject, useStartConversation } from "@/hooks/use-workspace-data";
import { currency } from "@/lib/format";
import type { ProjectRecord } from "@/lib/workspace-store";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

const STATUS_LABEL: Record<ProjectRecord["status"], string> = {
  new: "Intake",
  estimating: "Estimating",
  in_progress: "In progress",
  awaiting_approval: "Awaiting approval",
  completed: "Complete",
};

function ProjectsPage() {
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const createProjectMut = useCreateProject();
  const startConversation = useStartConversation();
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ name: "", address: "", budget: "" });

  const create = () => {
    if (!draft.name.trim()) {
      toast.error("Add a project name");
      return;
    }
    if (!userId) {
      toast.error("Sign in to create a project");
      return;
    }
    createProjectMut.mutate(
      {
        name: draft.name,
        address: draft.address || "Unspecified",
        status: "new",
        budget: draft.budget ? Number(draft.budget) : 0,
        spent: 0,
        nextMilestone: "Collect scope and estimates",
      },
      {
        onSuccess: (project) => {
          startConversation.mutate(
            {
              title: project.name,
              context: `Project · ${project.address}`,
              firstMessage: `Opened project "${project.name}".`,
              extra: { project: project.name, property: project.address },
            },
            {
              onSuccess: (thread) => {
                setCompose(false);
                setDraft({ name: "", address: "", budget: "" });
                toast.success("Project created", {
                  description: "A conversation is attached to this job.",
                });
                void navigate({ to: "/messages", search: { thread } });
              },
              onError: (e) =>
                toast.error(e instanceof Error ? e.message : "Could not start the conversation"),
            },
          );
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not create the project"),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Repair requests and estimates become projects. Each job stays linked to the property, lead, documents, and conversation that created it."
        action={
          <Button
            className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]"
            onClick={() => setCompose(true)}
          >
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading projects…</div>}
          {!isLoading && projects.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2">
              No projects yet. Create one to turn a repair request or estimate into a tracked job.
            </div>
          )}
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-display text-lg font-bold">
                      <HardHat className="h-4 w-4 text-[#70bf2b]" /> {p.name}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{p.address}</div>
                  </div>
                  <Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.roleView ? `${p.roleView} · ` : ""}Next: {p.nextMilestone || "—"}
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>Budget {currency(p.budget)}</span>
                  <span>Spent {currency(p.spent)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!userId) return;
                      startConversation.mutate(
                        {
                          title: p.name,
                          context: `Project · ${p.address}`,
                          firstMessage: `Following up on ${p.name}.`,
                          extra: { project: p.name, property: p.address },
                        },
                        {
                          onSuccess: (thread) =>
                            void navigate({ to: "/messages", search: { thread } }),
                          onError: (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Could not start the conversation",
                            ),
                        },
                      );
                    }}
                  >
                    Open conversation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void navigate({ to: "/documents" })}
                  >
                    Documents
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void navigate({ to: "/marketplace" })}
                  >
                    Related listing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Property / address</Label>
              <Input
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Budget</Label>
              <Input
                type="number"
                value={draft.budget}
                onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose(false)}>
              Cancel
            </Button>
            <Button onClick={create} className="bg-[#70bf2b] hover:bg-[#80ce38]">
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
