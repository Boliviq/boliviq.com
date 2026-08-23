import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  searchListingsFn,
  recordListingViewFn,
  listSavedSearchesFn,
  saveSearchFn,
  deleteSavedSearchFn,
  convertListingToLeadFn,
  type ListingSearchInput,
} from "@/lib/marketplace.functions";
import type { MarketplaceLead, MarketplaceListing, SavedSearch } from "@/lib/workspace-store";

export function useSearchListings(filters: ListingSearchInput) {
  const { userId } = useCurrentUser();
  const search = useServerFn(searchListingsFn);
  return useQuery<MarketplaceListing[]>({
    queryKey: ["marketplace-search", userId, filters],
    queryFn: () => search({ data: filters }),
    enabled: !!userId,
  });
}

export function useRecordListingView() {
  const record = useServerFn(recordListingViewFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => record({ data: { listingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-search"] }),
  });
}

export function useSavedSearches() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listSavedSearchesFn);
  return useQuery<SavedSearch[]>({
    queryKey: ["saved-searches", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useSaveSearch() {
  const { userId } = useCurrentUser();
  const save = useServerFn(saveSearchFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      query?: string;
      category?: string;
      location?: string;
      minPrice?: number;
      maxPrice?: number;
      alertEnabled?: boolean;
    }) => save({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches", userId] }),
  });
}

export function useDeleteSavedSearch() {
  const { userId } = useCurrentUser();
  const del = useServerFn(deleteSavedSearchFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches", userId] }),
  });
}

export function useConvertListingToLead() {
  const convert = useServerFn(convertListingToLeadFn);
  return useMutation<MarketplaceLead, Error, string>({
    mutationFn: (listingId) => convert({ data: { listingId } }),
  });
}
