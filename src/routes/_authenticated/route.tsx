import { useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { useRecordSession } from "@/hooks/use-identity";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("suspended_at, onboarded, primary_role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.suspended_at && !location.pathname.startsWith("/suspended")) {
      throw redirect({ to: "/suspended" });
    }
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const ready = Boolean(meta.onboarded || meta.primary_role || profile?.onboarded);
    if (
      !ready &&
      !location.pathname.startsWith("/onboarding") &&
      !location.pathname.startsWith("/suspended")
    ) {
      throw redirect({ to: "/onboarding" });
    }
    return { user: data.user, suspended: !!profile?.suspended_at };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const recordSession = useRecordSession();
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("boliviq:session-recorded")) return;
    recordSession.mutate(undefined, {
      onSuccess: () => sessionStorage.setItem("boliviq:session-recorded", "1"),
    });
  }, [recordSession]);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl">
          <SidebarTrigger />
          <UserMenu />
        </header>
        <main className="min-h-[calc(100vh-4rem)] flex-1 bg-[#f5f7fa]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
