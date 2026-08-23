import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  chargeCreditsFn,
  getCreditWalletSnapshotFn,
  refundCreditsFn,
  releaseCreditsFn,
  reserveCreditsFn,
} from "@/lib/credits.functions";

export function useCreditWalletSnapshot() {
  const { userId } = useCurrentUser();
  const get = useServerFn(getCreditWalletSnapshotFn);
  return useQuery({
    queryKey: ["credit-wallet", userId],
    queryFn: () => get(),
    enabled: !!userId,
  });
}

function useInvalidateWallet() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["credit-wallet", userId] });
}

export function useReserveCredits() {
  const run = useServerFn(reserveCreditsFn);
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: (input: { amount: number; label: string; idempotencyKey: string }) =>
      run({ data: input }),
    onSuccess: invalidate,
  });
}

export function useChargeCredits() {
  const run = useServerFn(chargeCreditsFn);
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      label: string;
      reservationId: string;
      idempotencyKey: string;
    }) => run({ data: input }),
    onSuccess: invalidate,
  });
}

export function useReleaseCredits() {
  const run = useServerFn(releaseCreditsFn);
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      label: string;
      reservationId: string;
      idempotencyKey: string;
    }) => run({ data: input }),
    onSuccess: invalidate,
  });
}

export function useRefundCredits() {
  const run = useServerFn(refundCreditsFn);
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      label: string;
      idempotencyKey: string;
      reservationId?: string;
    }) => run({ data: input }),
    onSuccess: invalidate,
  });
}
