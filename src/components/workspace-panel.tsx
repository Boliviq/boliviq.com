import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAcceptInvite,
  useCreateWorkspace,
  useInviteToWorkspace,
  useMyInvites,
  useSwitchWorkspace,
  useWorkspaces,
} from "@/hooks/use-identity";

export function WorkspacePanel() {
  const workspaces = useWorkspaces();
  const invites = useMyInvites();
  const createWs = useCreateWorkspace();
  const switchWs = useSwitchWorkspace();
  const invite = useInviteToWorkspace();
  const accept = useAcceptInvite();
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const current = (workspaces.data ?? []).find((w) => w.current);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Workspaces</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {(workspaces.data ?? []).map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {w.name} {w.current ? "· current" : ""}
                </div>
                <div className="text-xs text-muted-foreground">{w.owner ? "Owner" : w.role}</div>
              </div>
              {!w.current && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    switchWs.mutate(w.id, {
                      onSuccess: () => toast.success(`Switched to ${w.name}`),
                      onError: (e) =>
                        toast.error(e instanceof Error ? e.message : "Could not switch"),
                    })
                  }
                >
                  Switch
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New workspace name"
          />
          <Button
            disabled={!name.trim() || createWs.isPending}
            onClick={() =>
              createWs.mutate(name.trim(), {
                onSuccess: () => {
                  setName("");
                  toast.success("Workspace created");
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create"),
              })
            }
          >
            Create
          </Button>
        </div>
        {current?.owner && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Invite teammate by email"
            />
            <Button
              variant="outline"
              disabled={!inviteEmail.trim() || invite.isPending}
              onClick={() =>
                invite.mutate(
                  { workspaceId: current.id, email: inviteEmail.trim() },
                  {
                    onSuccess: () => {
                      setInviteEmail("");
                      toast.success("Invite saved — they can accept from Settings");
                    },
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Could not invite"),
                  },
                )
              }
            >
              Invite
            </Button>
          </div>
        )}
        {(invites.data ?? []).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Pending invites</div>
            {invites.data?.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="text-sm">
                  {i.workspaceName} · {i.role}
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    accept.mutate(i.id, {
                      onSuccess: () => toast.success(`Joined ${i.workspaceName}`),
                      onError: (e) =>
                        toast.error(e instanceof Error ? e.message : "Could not accept"),
                    })
                  }
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
