import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  advanceLeadStageFn,
  convertCompletedProjectToListingFn,
  convertLeadToProjectFn,
  convertLeadToPropertyFn,
  convertListingToPropertyFn,
  convertProjectToPropertyFn,
  convertPropertyPostFn,
} from "@/lib/crm.functions";
import type { PropertyPostTargetId } from "@/lib/canons";

function useInvalidateCrm() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["conversations", userId] });
    qc.invalidateQueries({ queryKey: ["marketplace-search"] });
    qc.invalidateQueries({ queryKey: ["projects", userId] });
  };
}

export function useConvertLeadToProject() {
  const run = useServerFn(convertLeadToProjectFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: invalidate,
  });
}

export function useConvertLeadToProperty() {
  const run = useServerFn(convertLeadToPropertyFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: invalidate,
  });
}

export function useConvertListingToProperty() {
  const run = useServerFn(convertListingToPropertyFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: invalidate,
  });
}

export function useConvertProjectToProperty() {
  const run = useServerFn(convertProjectToPropertyFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: invalidate,
  });
}

export function useConvertCompletedProjectToListing() {
  const run = useServerFn(convertCompletedProjectToListingFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (input: { id: string; disposition?: "homes_for_sale" | "rentals" }) =>
      run({ data: input }),
    onSuccess: invalidate,
  });
}

export function useConvertPropertyPost() {
  const run = useServerFn(convertPropertyPostFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (input: { id: string; target: PropertyPostTargetId }) => run({ data: input }),
    onSuccess: invalidate,
  });
}

export function useAdvanceLeadStage() {
  const run = useServerFn(advanceLeadStageFn);
  const invalidate = useInvalidateCrm();
  return useMutation({
    mutationFn: (input: { id: string; to: string }) => run({ data: input }),
    onSuccess: invalidate,
  });
}
