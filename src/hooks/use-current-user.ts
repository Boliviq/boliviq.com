import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isProfileRoleId, type ProfileRoleId } from "@/lib/canons";
import { DEFAULT_ACCOUNT, loadDraft, type AccountProfile } from "@/lib/workspace-store";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [primaryRole, setPrimaryRole] = useState<ProfileRoleId | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const user = data.user;
      setUserId(user?.id ?? null);
      const meta = user?.user_metadata ?? {};
      const role = typeof meta.primary_role === "string" ? meta.primary_role : null;
      setPrimaryRole(isProfileRoleId(role) ? role : null);
      setFullName((meta.full_name as string) ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { userId, primaryRole, fullName, loading };
}

export function useAccount() {
  const current = useCurrentUser();
  const [account, setAccount] = useState<AccountProfile>(DEFAULT_ACCOUNT);

  useEffect(() => {
    if (!current.userId) {
      setAccount({ ...DEFAULT_ACCOUNT, primary_role: current.primaryRole ?? "homeowner" });
      return;
    }
    const draft = loadDraft(current.userId);
    setAccount({
      ...draft,
      full_name: current.fullName || draft.full_name,
      primary_role: current.primaryRole ?? draft.primary_role,
    });
  }, [current.userId, current.primaryRole, current.fullName]);

  return {
    ...current,
    account,
    role: account.primary_role,
  };
}
