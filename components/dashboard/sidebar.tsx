"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconDashboard,
  IconFolder,
  type Icon,
  IconLogout,
  IconUser,
  IconShield,
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
import { logout } from "@/lib/actions/auth";

interface NavItem {
  title: string;
  url: string;
  icon: Icon;
}

const defaultNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "Projects", url: "/dashboard/projects", icon: IconFolder },
  { title: "Clients", url: "/dashboard/clients", icon: IconUser },
  { title: "Portal", url: "/dashboard/portal", icon: IconShield },
];

interface AppSidebarProps {
  items?: NavItem[];
  activeUrl?: string;
  logo?: React.ReactNode;
}

export function AppSidebar({
  items = defaultNavItems,
  activeUrl,
  logo,
}: AppSidebarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        <WorkspaceSwitcher />
      </div>

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
