import { useEffect, useState } from "react";
import { subscribeWorkspace } from "@/lib/workspace-store";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Re-renders when local workspace records change. */
export function useWorkspace() {
  const current = useCurrentUser();
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeWorkspace(() => setTick((n) => n + 1)), []);

  return { ...current, tick };
}
