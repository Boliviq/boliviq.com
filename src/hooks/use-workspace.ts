import { useCurrentUser } from "@/hooks/use-current-user";

/** Auth snapshot for canon workspace pages. Data now refreshes via react-query. */
export function useWorkspace() {
  return useCurrentUser();
}
