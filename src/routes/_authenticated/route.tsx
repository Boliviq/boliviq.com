import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const ready = Boolean(meta.onboarded || meta.primary_role);
    if (!ready && !location.pathname.startsWith("/onboarding")) {
      throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
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
