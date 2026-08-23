import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getAccessStateFn,
  listWorkspacesFn,
  createWorkspaceFn,
  inviteToWorkspaceFn,
  listMyInvitesFn,
  acceptInviteFn,
  switchWorkspaceFn,
  recordSessionFn,
  listSessionsFn,
  submitAppealFn,
  verifyPhoneFn,
  type AccessState,
  type WorkspaceSummary,
  type WorkspaceInvite,
  type SessionLogRow,
} from "@/lib/identity.functions";

export function useAccessState() {
  const { userId } = useCurrentUser();
  const get = useServerFn(getAccessStateFn);
  return useQuery<AccessState>({
    queryKey: ["access-state", userId],
    queryFn: () => get(),
    enabled: !!userId,
  });
}

export function useWorkspaces() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listWorkspacesFn);
  return useQuery<WorkspaceSummary[]>({
    queryKey: ["workspaces", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useCreateWorkspace() {
  const { userId } = useCurrentUser();
  const create = useServerFn(createWorkspaceFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => create({ data: { name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces", userId] });
      qc.invalidateQueries({ queryKey: ["access-state", userId] });
    },
  });
}

export function useInviteToWorkspace() {
  const invite = useServerFn(inviteToWorkspaceFn);
  return useMutation({
    mutationFn: (input: { workspaceId: string; email: string; role?: string }) =>
      invite({ data: input }),
  });
}

export function useMyInvites() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listMyInvitesFn);
  return useQuery<WorkspaceInvite[]>({
    queryKey: ["workspace-invites", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useAcceptInvite() {
  const { userId } = useCurrentUser();
  const accept = useServerFn(acceptInviteFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => accept({ data: { inviteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces", userId] });
      qc.invalidateQueries({ queryKey: ["workspace-invites", userId] });
      qc.invalidateQueries({ queryKey: ["access-state", userId] });
    },
  });
}

export function useSwitchWorkspace() {
  const { userId } = useCurrentUser();
  const switchWs = useServerFn(switchWorkspaceFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => switchWs({ data: { workspaceId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces", userId] });
      qc.invalidateQueries({ queryKey: ["access-state", userId] });
    },
  });
}

export function useRecordSession() {
  const record = useServerFn(recordSessionFn);
  return useMutation({
    mutationFn: () => record(),
  });
}

export function useSessions() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listSessionsFn);
  return useQuery<SessionLogRow[]>({
    queryKey: ["auth-sessions", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useSubmitAppeal() {
  const { userId } = useCurrentUser();
  const submit = useServerFn(submitAppealFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => submit({ data: { note } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["access-state", userId] }),
  });
}

export function useVerifyPhone() {
  const { userId } = useCurrentUser();
  const verify = useServerFn(verifyPhoneFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => verify({ data: { phone } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["access-state", userId] }),
  });
}
