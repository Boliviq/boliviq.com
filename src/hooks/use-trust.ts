import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import { listPendingVerificationsFn, reviewVerificationFn } from "@/lib/trust.functions";

export function usePendingVerifications() {
  const { userId } = useCurrentUser();
  const list = useServerFn(listPendingVerificationsFn);
  return useQuery({
    queryKey: ["pending-verifications", userId],
    queryFn: () => list(),
    enabled: !!userId,
  });
}

export function useReviewVerification() {
  const { userId } = useCurrentUser();
  const run = useServerFn(reviewVerificationFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; decision: "granted" | "rejected"; reason: string }) =>
      run({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-verifications", userId] });
      qc.invalidateQueries({ queryKey: ["verifications"] });
    },
  });
}
