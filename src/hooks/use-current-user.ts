import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isProfileRoleId, type ProfileRoleId } from "@/lib/canons";
import { DEFAULT_ACCOUNT, type AccountProfile } from "@/lib/workspace-store";
import { getAccountFn } from "@/lib/workspace.functions";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [primaryRole, setPrimaryRole] = useState<ProfileRoleId | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
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
      setEmail(user?.email ?? null);
      setEmailConfirmed(!!user?.email_confirmed_at);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { userId, primaryRole, fullName, email, emailConfirmed, loading };
}

export function useAccount() {
  const current = useCurrentUser();
  const get = useServerFn(getAccountFn);
  const profile = useQuery<AccountProfile>({
    queryKey: ["account-profile", current.userId],
    queryFn: () => get(),
    enabled: !!current.userId,
  });
  const account: AccountProfile = profile.data ?? {
    ...DEFAULT_ACCOUNT,
    full_name: current.fullName || DEFAULT_ACCOUNT.full_name,
    primary_role: current.primaryRole ?? DEFAULT_ACCOUNT.primary_role,
  };

  return {
    ...current,
    account,
    role: account.primary_role,
    accountLoading: profile.isLoading,
  };
}
