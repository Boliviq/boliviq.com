import { Link, useRouterState } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Building2, Calculator, Users, UserRound, Kanban, Phone,
  CheckSquare, Sigma, BarChart3, Plug, CreditCard, Settings, Zap,
  Shield, Megaphone, LifeBuoy, Ticket, Users2, DollarSign,
} from "lucide-react";

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Deal Analyzer", url: "/deal-analyzer", icon: Calculator },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Contacts", url: "/contacts", icon: UserRound },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Calls", url: "/calls", icon: Phone },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Automations", url: "/automations", icon: Zap },
  { title: "Calculators", url: "/calculators", icon: Sigma },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const;

const adminNav = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Checkout Verify", url: "/admin/checkout-verification", icon: CreditCard },
  { title: "Users", url: "/admin/users", icon: Users2 },
  { title: "Promotions", url: "/promotions", icon: Ticket },
  { title: "Plan pricing", url: "/admin/pricing", icon: DollarSign },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
] as const;

const secondary = [
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Help", url: "/support", icon: LifeBuoy },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center px-1 py-2 text-sidebar-foreground">
          <BrandLogo inverse showTagline className="group-data-[collapsible=icon]:hidden" />
          <BrandLogo inverse compact className="hidden group-data-[collapsible=icon]:flex" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
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
