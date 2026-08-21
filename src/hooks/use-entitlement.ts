import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntitlement } from "@/lib/entitlements.functions";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useEntitlement() {
  const { userId } = useCurrentUser();
  const fn = useServerFn(getEntitlement);
  return useQuery({
    queryKey: ["entitlement", userId],
    enabled: !!userId,
    queryFn: () => fn({ data: {} }),
    staleTime: 30_000,
  });
}

export function useIsAdmin() {
  const ent = useEntitlement();
  return { isAdmin: !!ent.data?.isAdmin, loading: ent.isLoading };
}
