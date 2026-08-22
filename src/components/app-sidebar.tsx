import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Calculator,
  Users,
  UserRound,
  Kanban,
  Phone,
  CheckSquare,
  Sigma,
  BarChart3,
  Plug,
  CreditCard,
  Settings,
  Zap,
  Shield,
  Megaphone,
  LifeBuoy,
  Ticket,
  Users2,
  Store,
  MessageSquare,
  FolderKanban,
  Files,
  Sparkles,
  BadgeCheck,
  HardHat,
} from "lucide-react";
import { navForRole, type NavItem } from "@/lib/canons";
import { useAccount } from "@/hooks/use-current-user";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/marketplace": Store,
  "/professionals": HardHat,
  "/messages": MessageSquare,
  "/properties": Building2,
  "/projects": FolderKanban,
  "/documents": Files,
  "/leads": Users,
  "/contacts": UserRound,
  "/pipeline": Kanban,
  "/tasks": CheckSquare,
  "/calls": Phone,
  "/assistant": Sparkles,
  "/deal-analyzer": Calculator,
  "/calculators": Sigma,
  "/reports": BarChart3,
  "/automations": Zap,
  "/marketing": Megaphone,
};

const GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "work", label: "Work" },
  { key: "crm", label: "CRM" },
  { key: "tools", label: "Tools" },
];

const adminNav = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Checkout Verify", url: "/admin/checkout-verification", icon: CreditCard },
  { title: "Users", url: "/admin/users", icon: Users2 },
  { title: "Promotions", url: "/promotions", icon: Ticket },
] as const;

const secondary = [
  { title: "Verification", url: "/verification", icon: BadgeCheck },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Help", url: "/support", icon: LifeBuoy },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { role, account } = useAccount();
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");
  const items = navForRole(role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center px-1 py-2 text-sidebar-foreground">
          <BrandLogo inverse showTagline className="group-data-[collapsible=icon]:hidden" />
          <BrandLogo inverse compact className="hidden group-data-[collapsible=icon]:flex" />
        </Link>
        <div className="truncate px-2 pb-2 text-[11px] uppercase tracking-wide text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {account.primary_role.replaceAll("_", " ")} workspace
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((g) => {
          const groupItems = items.filter((i) => i.group === g.key);
          if (!groupItems.length) return null;
          return (
            <SidebarGroup key={g.key}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => {
                    const Icon = ICONS[item.url] ?? LayoutDashboard;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                        >
                          <Link to={item.url}>
                            <Icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        {role === "administrator" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {secondary.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
