import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { getCurrentWorkspace } from "@/lib/actions/workspace";
import {
  IconFolder,
  IconUsers,
  IconClipboardList,
  IconClock,
} from "@tabler/icons-react";

const stats = [
  {
    title: "Total Projects",
    value: "12",
    icon: IconFolder,
    change: "+2 this month",
  },
  {
    title: "Active Requests",
    value: "5",
    icon: IconClipboardList,
    change: "3 pending",
  },
  {
    title: "Team Members",
    value: "8",
    icon: IconUsers,
    change: "+1 new",
  },
  {
    title: "Avg. Response",
    value: "2.4h",
    icon: IconClock,
    change: "−12% faster",
  },
];

export default async function Dashboard() {
  const currentWorkSpace = await getCurrentWorkspace();
  let workspaceData;
  if (currentWorkSpace.success && currentWorkSpace.data) {
    workspaceData = currentWorkSpace.data;
  }
  console.log(workspaceData);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
      </div>
      <DashboardHeader userName="SARAH" workspaceName="Sarah Workspace" />
    </div>
  );
}
