import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  listDocumentsFn,
  createDocumentFn,
  listProjectsFn,
  createProjectFn,
  listListingsFn,
  createListingFn,
  listSavedListingIdsFn,
  toggleSavedListingFn,
  reportListingFn,
  listConversationsFn,
  startConversationFn,
  sendMessageFn,
  listProfessionalsFn,
  listVerificationsFn,
  startVerificationFn,
  getCreditWalletFn,
  getAccountFn,
  saveAccountDraftFn,
  getAssistantLogFn,
  saveAssistantLogFn,
  type CreditWalletView,
} from "@/lib/workspace.functions";
import type {
  AccountProfile,
  AssistantTurn,
  ConversationExtras,
  DirectoryProfessional,
  DocRecord,
  MarketplaceListing,
  ProjectRecord,
  Thread,
} from "@/lib/workspace-store";
import type { VerificationTierId } from "@/lib/canons";

/**
 * React Query hooks over the Supabase-backed workspace server functions.
 * Data is keyed by the authenticated user id so switching accounts refetches,
 * and mutations invalidate the matching list so the UI stays in sync. RLS on
 * the server is the real isolation boundary; the user id here is only a cache key.
 */

export function useDocuments() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listDocumentsFn);
  return useQuery<DocRecord[]>({
    queryKey: ["documents", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useCreateDocument() {
  const { userId } = useCurrentUser();
  const create = useServerFn(createDocumentFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; kind?: string; related?: string; restricted?: boolean }) =>
      create({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", userId] }),
  });
}

export function useProjects() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listProjectsFn);
  return useQuery<ProjectRecord[]>({
    queryKey: ["projects", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useCreateProject() {
  const { userId } = useCurrentUser();
  const create = useServerFn(createProjectFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      address?: string;
      status?: ProjectRecord["status"];
      budget?: number;
      spent?: number;
      nextMilestone?: string;
    }) => create({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", userId] }),
  });
}

export function useListings() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listListingsFn);
  return useQuery<MarketplaceListing[]>({
    queryKey: ["marketplace-listings", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useCreateListing() {
  const { userId } = useCurrentUser();
  const create = useServerFn(createListingFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      description?: string;
      category: string;
      location?: string;
      price?: number;
      budget?: number;
      photos?: string[];
      role?: string;
      authorName?: string;
      postedBy?: string;
      propertyLabel?: string;
      projectLabel?: string;
      visibility?: "public" | "limited";
    }) => create({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-listings", userId] }),
  });
}

export function useSavedListingIds() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listSavedListingIdsFn);
  return useQuery<string[]>({
    queryKey: ["saved-listings", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useToggleSavedListing() {
  const { userId } = useCurrentUser();
  const toggle = useServerFn(toggleSavedListingFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => toggle({ data: { listingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-listings", userId] }),
  });
}

export function useReportListing() {
  const report = useServerFn(reportListingFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { listingId: string; reason?: string }) => report({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-listings"] }),
  });
}

export function useConversations() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listConversationsFn);
  return useQuery<Thread[]>({
    queryKey: ["conversations", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useStartConversation() {
  const { userId } = useCurrentUser();
  const start = useServerFn(startConversationFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      context?: string;
      firstMessage: string;
      extra?: ConversationExtras & { participantUserId?: string };
    }) => start({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations", userId] }),
  });
}

export function useSendMessage() {
  const { userId } = useCurrentUser();
  const send = useServerFn(sendMessageFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { conversationId: string; body: string }) => send({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations", userId] }),
  });
}

export function useProfessionals() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listProfessionalsFn);
  return useQuery<DirectoryProfessional[]>({
    queryKey: ["professionals", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useVerifications() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listVerificationsFn);
  return useQuery<VerificationTierId[]>({
    queryKey: ["verifications", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useStartVerification() {
  const { userId } = useCurrentUser();
  const start = useServerFn(startVerificationFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: Exclude<VerificationTierId, "unverified">) => start({ data: { tier } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verifications", userId] }),
  });
}

export function useCreditWallet() {
  const { userId } = useCurrentUser();
  const get = useServerFn(getCreditWalletFn);
  return useQuery<CreditWalletView>({
    queryKey: ["credit-wallet", userId],
    queryFn: () => get(),
    enabled: !!userId,
  });
}

export function useAccountProfile() {
  const { userId } = useCurrentUser();
  const get = useServerFn(getAccountFn);
  return useQuery<AccountProfile>({
    queryKey: ["account-profile", userId],
    queryFn: () => get(),
    enabled: !!userId,
  });
}

export function useSaveAccountDraft() {
  const { userId } = useCurrentUser();
  const save = useServerFn(saveAccountDraftFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AccountProfile>) => save({ data: input }),
    onSuccess: (row) => {
      qc.setQueryData(["account-profile", userId], row);
      qc.invalidateQueries({ queryKey: ["account-profile", userId] });
    },
  });
}

export function useAssistantLog() {
  const { userId } = useCurrentUser();
  const get = useServerFn(getAssistantLogFn);
  return useQuery<AssistantTurn[]>({
    queryKey: ["assistant-log", userId],
    queryFn: () => get(),
    enabled: !!userId,
  });
}

export function useSaveAssistantLog() {
  const { userId } = useCurrentUser();
  const save = useServerFn(saveAssistantLogFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messages: AssistantTurn[]) => save({ data: { messages } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assistant-log", userId] }),
  });
}
