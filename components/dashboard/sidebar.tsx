"use client";

import {
  IconDashboard,
  IconUsers,
  IconFolder,
  IconSettings,
  type Icon,
  IconLogout,
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

interface NavItem {
  title: string;
  url: string;
  icon: Icon;
}

const defaultNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "Projects", url: "/dashboard/projects", icon: IconFolder },
  { title: "Team", url: "/dashboard/team", icon: IconUsers },
  { title: "Settings", url: "/dashboard/settings", icon: IconSettings },
];

interface AppSidebarProps {
  items?: NavItem[];
  activeUrl?: string;
  logo?: React.ReactNode;
  handleLogout: () => void;
}

export function AppSidebar({
  items = defaultNavItems,
  activeUrl,
  logo,
  handleLogout,
}: AppSidebarProps) {
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
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url} className="w-full">
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={activeUrl === item.url}
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
        <Button onClick={handleLogout} size="lg" className="w-full">
          <IconLogout /> Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
