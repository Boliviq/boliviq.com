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
} from "@/lib/workspace.functions";
import type { DocRecord, ProjectRecord, MarketplaceListing } from "@/lib/workspace-store";

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
