"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFolder,
  type Icon,
  IconLogout,
  IconUser,
  IconShield,
  IconUsers,
  IconCreditCard,
  IconSettings,
  IconLink,
} from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "../ui/button";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { WorkspaceListItem } from "@/lib/actions/workspace";
import { logout } from "@/lib/actions/auth";

interface NavItem {
  title: string;
  url: string;
  icon: Icon;
  /** Only shown to owners/admins */
  adminOnly?: boolean;
  /** Only shown to owners */
  ownerOnly?: boolean;
  /** Only shown when user has project management permissions */
  projectManageOnly?: boolean;
}

const defaultNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "Projects", url: "/dashboard/projects", icon: IconFolder },
  { title: "Clients", url: "/dashboard/clients", icon: IconUser, adminOnly: true },
  { title: "Portal", url: "/dashboard/portal", icon: IconShield, adminOnly: true },
  { title: "Team", url: "/dashboard/team", icon: IconUsers, adminOnly: true },
  { title: "Links", url: "/dashboard/links", icon: IconLink, adminOnly: true },
  { title: "Billing", url: "/dashboard/billing", icon: IconCreditCard, ownerOnly: true },
  { title: "Settings", url: "/dashboard/settings", icon: IconSettings, adminOnly: true },
];

interface AppSidebarProps {
  items?: NavItem[];
  logo?: React.ReactNode;
  /** Owner/admin — unlocks Team management & Billing */
  isAdmin?: boolean;
  /** Owner only — unlocks Billing */
  isOwner?: boolean;
  /** Resolved on the server (no client fetch flash) */
  workspaces?: WorkspaceListItem[];
}

export function AppSidebar({
  items = defaultNavItems,
  logo,
  isAdmin = true,
  isOwner = false,
  workspaces = [],
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const visibleItems = items.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === url : pathname.startsWith(url);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between p-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {logo ?? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
                Handoff
              </span>
            </Link>
          )}
        </div>
        <SidebarTrigger />
      </SidebarHeader>

      {/* Workspace Switcher — hidden when sidebar is collapsed */}
      <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
        <WorkspaceSwitcher workspaces={workspaces} />
      </div>

      <SidebarContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url} className="w-full">
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive(item.url)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Button
          onClick={handleLogout}
          size="lg"
          className="w-full"
          disabled={isLoggingOut}
        >
          <IconLogout />{" "}
          <span className="group-data-[collapsible=icon]:hidden">
            {isLoggingOut ? "Signing out..." : "Logout"}
          </span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
