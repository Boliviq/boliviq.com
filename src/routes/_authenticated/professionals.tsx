import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VerificationBadgeRow } from "@/components/verification-badge";
import { PROFILE_ROLES, TRADE_LABELS, VERIFICATION_DISCLAIMER, type ProfileRoleId } from "@/lib/canons";
import { PROFESSIONAL_SEED } from "@/lib/professional-seed";
import { useAccount } from "@/hooks/use-current-user";
import { useWorkspace } from "@/hooks/use-workspace";
import { createProject, startConversation } from "@/lib/workspace-store";

export const Route = createFileRoute("/_authenticated/professionals")({
  component: ProfessionalsPage,
});

function ProfessionalsPage() {
  const { userId } = useWorkspace();
  const { account } = useAccount();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<ProfileRoleId | "all">("all");

  const people = useMemo(() => {
    return PROFESSIONAL_SEED.filter((p) => {
      const okRole = role === "all" || p.role === role;
      const hay = `${p.name} ${p.company} ${p.serviceArea} ${p.specialties.join(" ")}`.toLowerCase();
      return okRole && (!q || hay.includes(q.toLowerCase()));
    });
  }, [role, q]);

  const directoryRoles = PROFILE_ROLES.filter((r) => r.id !== "homeowner" && r.id !== "administrator");

  return (
    <>
      <PageHeader
        title="Professionals"
        description="Directory of verified and unverified service providers. Connect a professional to a property, project, or conversation without leaving the record."
      />
      <div className="space-y-4 p-4 sm:p-8">
        <Alert>
          <AlertDescription className="text-sm">{VERIFICATION_DISCLAIMER}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, trade, or city…" className="pl-9" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setRole("all")} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${role === "all" ? "border-[#70bf2b] bg-[#70bf2b]/10 font-semibold" : ""}`}>All roles</button>
          {directoryRoles.map((r) => (
            <button key={r.id} type="button" onClick={() => setRole(r.id)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${role === r.id ? "border-[#70bf2b] bg-[#70bf2b]/10 font-semibold" : ""}`}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {people.map((p) => {
            const roleLabel = PROFILE_ROLES.find((r) => r.id === p.role)?.label ?? p.role;
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg font-bold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.company} · {roleLabel}</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {p.rating || "—"}
                      <span className="font-normal text-muted-foreground">({p.reviews})</span>
                    </div>
                  </div>
                  <VerificationBadgeRow tiers={p.tiers} />
                  <p className="text-sm text-muted-foreground">{p.bio}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.specialties.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    {p.trades?.map((t) => (
                      <Badge key={t} variant="outline">{TRADE_LABELS[t as keyof typeof TRADE_LABELS] ?? t}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.serviceArea} · {p.years} yrs · responds {p.responseTime}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        if (!userId) {
                          toast.error("Sign in to connect with professionals");
                          return;
                        }
                        const thread = startConversation(
                          userId,
                          `Inquiry — ${p.name}`,
                          `Professional · ${roleLabel}`,
                          `Hi ${p.name}, ${account.full_name || "I"} would like to discuss a job in ${p.serviceArea}.`,
                          { participants: [account.full_name || "You", p.name] },
                        );
                        toast.success("Conversation started");
                        void navigate({ to: "/messages", search: { thread } });
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/verification" })}>Verification</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!userId) {
                          toast.error("Sign in to connect with professionals");
                          return;
                        }
                        const project = createProject(userId, {
                          name: `${p.company} — invited`,
                          address: p.serviceArea,
                          status: "new",
                          roleView: `Invited ${p.name}`,
                          budget: 0,
                          spent: 0,
                          nextMilestone: "Share scope and schedule a walk-through",
                        });
                        startConversation(
                          userId,
                          project.name,
                          `Project · ${p.name}`,
                          `Invited ${p.name} (${roleLabel}) onto a project.`,
                          { project: project.name, participants: [account.full_name || "You", p.name] },
                        );
                        toast.success("Professional invited to a project");
                        void navigate({ to: "/projects" });
                      }}
                    >
                      Invite to project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
